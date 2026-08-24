"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, ImagePlus, Keyboard, Loader2, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ErrorRecoveryCard } from "@/components/error-recovery-card";
import { Button } from "@/components/ui/button";
import { useWasteLessStore } from "@/hooks/use-store";
import { useToast } from "@/components/toast";
import {
  getAllOcrCorrections,
  getAllProductAliases,
  saveOcrCorrections,
  saveProductAliases,
} from "@/lib/db";
import {
  afterAliasPersisted,
  collectAliasLearnings,
  toAliasEntries,
} from "@/lib/product-knowledge";
import { createId } from "@/lib/utils";
import {
  createProcessingReceiptExpense,
  runBackgroundReceiptParse,
} from "@/lib/background-receipt-processor";
import {
  createScanTraceId,
  stampTimeline,
  type ScanTimeline,
} from "@/lib/receipt-scan-timeline";
import { analysisToExpenseDraft, createManualExpense } from "@/lib/expense-factory";
import {
  applyCorrectionsToExpense,
  buildCorrectionRecords,
} from "@/lib/ocr-correction-memory";
import {
  fileToDataUrl,
  preprocessReceiptImage,
} from "@/lib/receipt-image-preprocess";
import { checkReceiptConsistency, findLineItemIssues } from "@/lib/receipt-quality";
import { ITEM_CONFIRM_THRESHOLD } from "@/lib/receipt-pipeline";
import { trackProductEvent } from "@/lib/product-analytics";
import { trackFirstReceiptSaved, trackTiming } from "@/lib/beta-telemetry";
import { setLastScanConfidence } from "@/lib/beta-feedback";
import { OcrResultSummary } from "@/components/ocr-result-summary";
import { OcrTextPanel } from "@/components/ocr-text-panel";
import type { AnalysisResult, Expense } from "@/lib/types";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import { isDebugClipboardUiEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { parseStoredParserPayload } from "@/lib/receipt-engine-debug/parseParserPayload";
import {
  buildReceiptEngineOcrSummary,
  type ReceiptEngineOcrSummary,
} from "@/lib/receipt-engine-debug/buildReceiptEngineOcrSummary";
import { APP_VERSION } from "@/lib/app-version";
import {
  isPendingReceiptReview,
  resolveReviewRoute,
} from "@/lib/expense-navigation";
import {
  onLaunchFile,
  takePendingLaunchFile,
} from "@/lib/pwa-launch-handler";

const ReviewForm = dynamic(
  () =>
    import("@/components/review-form").then((m) => ({
      default: m.ReviewForm,
    })),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const CopyAllDebugButton = dynamic(
  () =>
    import("@/components/copy-all-debug-button").then((m) => ({
      default: m.CopyAllDebugButton,
    })),
  { ssr: false }
);

const ReceiptEngineResult = dynamic(
  () =>
    import("@/components/receipt-engine-result").then((m) => ({
      default: m.ReceiptEngineResult,
    })),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

type Mode = "chooser" | "manual" | "review" | "engine-result";

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get("welcome") === "1";
  const reviewId = searchParams.get("review");
  const { addExpense, addExpenseOptimistic, updateExpense, removeExpense, categories, expenses, ready } =
    useWasteLessStore();
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pageLoadRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const scanStartRef = useRef<number | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [mode, setMode] = useState<Mode>("chooser");
  const [draft, setDraft] = useState<Expense | null>(null);
  /** Unedited OCR draft — used to detect user corrections on save. */
  const [ocrBaseline, setOcrBaseline] = useState<Expense | null>(null);
  const [correctionsApplied, setCorrectionsApplied] = useState(0);
  const [ocrSummary, setOcrSummary] = useState<ReceiptEngineOcrSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sourceHint, setSourceHint] = useState<"receipt" | "bank_screenshot">(
    "receipt"
  );
  const [enginePurchase, setEnginePurchase] = useState<PurchaseDraft | null>(null);
  const [engineValidation, setEngineValidation] =
    useState<ValidationReportGolden | null>(null);
  const [engineImageUrl, setEngineImageUrl] = useState<string | null>(null);
  const [engineRawVision, setEngineRawVision] = useState<string>("");

  const parserPayload = useMemo(
    () => parseStoredParserPayload(draft?.aiResponseJson),
    [draft?.aiResponseJson]
  );
  const showDebugClipboard = isDebugClipboardUiEnabled();
  const analyzeFileRef = useRef<(file: File) => Promise<void>>(async () => {});
  const loadedReviewIdRef = useRef<string | null>(null);

  const reviewRoute = useMemo(
    () => resolveReviewRoute(reviewId, expenses, ready),
    [reviewId, expenses, ready]
  );
  const awaitingReceiptReview =
    draft != null && isPendingReceiptReview(draft.parseStatus);

  useEffect(() => {
    if (reviewRoute.state === "loading") return;

    if (reviewRoute.state === "review") {
      const pending = reviewRoute.expense;
      if (loadedReviewIdRef.current !== pending.id) {
        loadedReviewIdRef.current = pending.id;
        setDraft(pending);
        setOcrBaseline(JSON.parse(JSON.stringify(pending)) as Expense);
        setMode("review");
      }
      return;
    }

    loadedReviewIdRef.current = null;

    if (reviewRoute.state === "finalized") {
      router.replace(`/expense?id=${encodeURIComponent(reviewRoute.expense.id)}`);
      return;
    }

    if (reviewRoute.state === "not_found" && reviewId) {
      toast("Onay bekleyen fiş bulunamadı.", "default");
      router.replace("/add");
    }
  }, [reviewRoute, reviewId, router, toast]);

  useEffect(() => {
    if (mode !== "review" || !parserPayload) return;
    setOcrSummary(
      buildReceiptEngineOcrSummary(parserPayload.purchase, parserPayload.validation)
    );
  }, [mode, parserPayload]);

  const analyzeWithReceiptEngine = async (file: File) => {
    setError(null);
    scanStartRef.current = performance.now();
    const scanTraceId = createScanTraceId();
    const clientTimeline: ScanTimeline = {};
    stampTimeline(clientTimeline, "t0_camera_finished");
    try {
      const previewUrl = await fileToDataUrl(file);
      const placeholder = createProcessingReceiptExpense(previewUrl);
      await addExpenseOptimistic(placeholder);
      toast("Fişiniz arka planda işleniyor…", "default");
      setMode("chooser");
      router.push("/");

      void runBackgroundReceiptParse({
        expenseId: placeholder.id,
        file,
        imageDataUrl: previewUrl,
        categories,
        scanTraceId,
        clientTimeline,
        onUpdate: (expense) => updateExpense(expense),
        onSuccess: (expense) => {
          toast("Fişiniz hazır! İncelemek ve onaylamak için dokunun.", "success", {
            actionLabel: "İncele",
            onAction: () =>
              router.push(`/add?review=${encodeURIComponent(expense.id)}`),
          });
          trackProductEvent("receipt_scan_success", {
            feature: "receipt-engine-background",
          });
          if (scanStartRef.current != null) {
            trackTiming(
              "time_to_parse_complete",
              Math.round(performance.now() - scanStartRef.current)
            );
          }
        },
        onError: (message) => {
          toast(message, "danger");
          trackProductEvent("receipt_scan_fail", {
            feature: "receipt-engine-background",
            meta: { message: message.slice(0, 120) },
          });
        },
      });
    } catch (err) {
      trackProductEvent("receipt_scan_fail", {
        feature: "receipt-engine-background",
        meta: {
          message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
        },
      });
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  };

  const analyzeFile = async (file: File) => {
    if (sourceHint === "receipt") {
      await analyzeWithReceiptEngine(file);
      return;
    }
    setLoading(true);
    setError(null);
    setCorrectionsApplied(0);
    setOcrSummary(null);
    try {
      const originalStart = performance.now();
      const originalDataUrl = await fileToDataUrl(file);
      const originalEncodeMs = Math.round(performance.now() - originalStart);
      const enhanced = await preprocessReceiptImage(file, "enhanced");
      const threshold = await preprocessReceiptImage(file, "threshold");
      const preprocessMs = enhanced.timings.totalMs + threshold.timings.totalMs;
      const resizeMs = enhanced.timings.resizeMs + threshold.timings.resizeMs;
      const base64EncodeMs =
        enhanced.timings.base64EncodeMs +
        threshold.timings.base64EncodeMs +
        originalEncodeMs;

      const body = new FormData();
      body.append(
        "image",
        new File([enhanced.blob], "receipt-enhanced.jpg", {
          type: "image/jpeg",
        })
      );
      body.append(
        "imageAlt",
        new File([threshold.blob], "receipt-threshold.jpg", {
          type: "image/jpeg",
        })
      );
      body.append("originalDataUrl", originalDataUrl);
      body.append("sourceHint", sourceHint);
      body.append("preprocessMs", String(preprocessMs));
      body.append("resizeMs", String(resizeMs));
      body.append("base64EncodeMs", String(base64EncodeMs));

      const allCorrections = await getAllOcrCorrections();
      const learnedRecords = await getAllProductAliases();
      const learnedAliases = toAliasEntries(learnedRecords);
      body.append("learnedAliases", JSON.stringify(learnedAliases));
      body.append("corrections", JSON.stringify(allCorrections));

      const tAnalyze = performance.now();
      const res = await fetch("/api/analyze", {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (process.env.NODE_ENV === "development") {
        console.info(
          `[receipt] analyze: ${Math.round(performance.now() - tAnalyze)}ms`,
          json.stageLog ?? "",
          json.debug ?? ""
        );
      }
      if (!res.ok) {
        const reason =
          typeof json.failureReason === "string" ? json.failureReason : null;
        const debugStages =
          process.env.NODE_ENV === "development" &&
          json.debug &&
          typeof json.debug === "object" &&
          Array.isArray((json.debug as { stages?: unknown }).stages)
            ? (json.debug as { stages: Array<{ stage: string; status: string }> })
                .stages
            : null;
        if (process.env.NODE_ENV === "development") {
          console.error("[receipt] analyze failed", {
            reason,
            debug: json.debug,
            details: json.details,
          });
        }
        const stageHint = debugStages
          ?.filter((s) => s.status === "fail")
          .map((s) => s.stage)
          .join(", ");
        throw new Error(
          json.error ||
            reason ||
            (stageHint ? `Analiz başarısız (${stageHint})` : "Analiz başarısız")
        );
      }

      const analysis = json.data as AnalysisResult;
      let next = analysisToExpenseDraft(
        analysis,
        // Prefer original photo for the gallery; API may already return it
        json.imageDataUrl ?? originalDataUrl,
        json.rawAiResponse ?? JSON.stringify(json.data),
        categories
      );

      // Baseline = raw OCR draft (before correction memory) so we learn real edits
      const rawBaseline = JSON.parse(JSON.stringify(next)) as Expense;
      setOcrBaseline(rawBaseline);

      const serverApplied = (json.correctionsApplied as number | undefined) ?? 0;
      if (serverApplied === 0) {
        const applied = applyCorrectionsToExpense(next, allCorrections);
        next = applied.expense;
        setCorrectionsApplied(applied.appliedCount);
      } else {
        setCorrectionsApplied(serverApplied);
      }

      const consistency = checkReceiptConsistency(
        next.items,
        next.totalAmount,
        next.charges,
        next.discounts
      );
      const issues = findLineItemIssues(
        next.items,
        next.totalAmount,
        next.charges,
        next.discounts
      );
      setOcrSummary({
        productCount: next.items.filter((i) => i.name.trim()).length,
        reviewCount: next.items.filter(
          (i) => (i.confidence ?? 1) < ITEM_CONFIRM_THRESHOLD
        ).length,
        totalVerified: !consistency.inconsistent,
        ocrConfidence: next.confidence ?? null,
        mathValidationPassed: !consistency.inconsistent,
        issues,
      });

      setDraft(next);
      setMode("review");
      setLastScanConfidence(next.confidence ?? undefined);
      trackProductEvent("receipt_scan_success", {
        feature: "legacy-analyze",
      });
      if (scanStartRef.current != null) {
        trackTiming(
          "time_to_parse_complete",
          Math.round(performance.now() - scanStartRef.current)
        );
      }
    } catch (err) {
      trackProductEvent("receipt_scan_fail", {
        feature: "legacy-analyze",
        meta: { message: err instanceof Error ? err.message.slice(0, 120) : "unknown" },
      });
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      if (scanStartRef.current == null) {
        scanStartRef.current = performance.now();
        trackTiming(
          "time_to_scan_start",
          Math.round(scanStartRef.current - pageLoadRef.current)
        );
      }
      await analyzeFile(file);
    }
  };

  analyzeFileRef.current = analyzeFile;

  useEffect(() => {
    const runLaunchFile = (file: File) => {
      if (scanStartRef.current == null) {
        scanStartRef.current = performance.now();
        trackTiming(
          "time_to_scan_start",
          Math.round(scanStartRef.current - pageLoadRef.current)
        );
      }
      void analyzeFileRef.current(file);
    };

    const pending = takePendingLaunchFile();
    if (pending) runLaunchFile(pending);
    return onLaunchFile(runLaunchFile);
  }, []);

  const startManual = () => {
    const defaultCategory =
      categories.find((c) => c.id === "market")?.id ??
      categories.find((c) => c.id === "other")?.id ??
      categories[0]?.id ??
      "other";
    setOcrBaseline(null);
    setCorrectionsApplied(0);
    setDraft(createManualExpense({ category: defaultCategory }));
    setMode("manual");
  };

  const handleSave = async (expense: Expense) => {
    setSaving(true);
    try {
      // Record user OCR corrections without overwriting original OCR fields
      if (ocrBaseline && mode === "review") {
        const rows = buildCorrectionRecords(ocrBaseline, expense);
        if (rows.length) {
          await saveOcrCorrections(rows);
          trackProductEvent("manual_edit", {
            feature: "ocr-correction",
            meta: { count: rows.length },
          });
        }

        const existingLearned = toAliasEntries(await getAllProductAliases());
        const aliasRows = collectAliasLearnings(
          ocrBaseline,
          expense,
          existingLearned
        );
        if (aliasRows.length) {
          const now = new Date().toISOString();
          await saveProductAliases(
            aliasRows.map((a) => ({
              id: createId("palias"),
              ocr: a.ocr,
              productId: a.productId,
              createdAt: now,
            }))
          );
          afterAliasPersisted();
        }
      }
      const approved: Expense = {
        ...expense,
        parseStatus: null,
        updatedAt: new Date().toISOString(),
      };
      if (
        isPendingReceiptReview(expense.parseStatus) ||
        expenses.some((e) => e.id === expense.id)
      ) {
        await updateExpense(approved);
      } else {
        await addExpense(approved);
      }
      if (expenses.length === 0) {
        trackFirstReceiptSaved();
      }
      toast(
        isPendingReceiptReview(expense.parseStatus) || reviewId
          ? "Fiş onaylandı ve kaydedildi!"
          : "Harcama kaydedildi",
        "success"
      );
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePending = async () => {
    if (!draft) return;
    setDeleting(true);
    try {
      await removeExpense(draft.id);
      toast("Fiş silindi", "default");
      setDraft(null);
      setOcrBaseline(null);
      setOcrSummary(null);
      setMode("chooser");
      router.push("/");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      {reviewId && reviewRoute.state === "loading" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
      <header className="mb-5">
        <h1 className="font-display text-2xl tracking-tight">
          {mode === "review" ? "Harcama incele" : "Harcama ekle"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "review"
            ? "Fişi kontrol edip onaylayın"
            : `Fiş, banka ekran görüntüsü veya hızlı manuel giriş · v${APP_VERSION}`}
        </p>
      </header>

      {showWelcome && !welcomeDismissed && mode === "chooser" && !loading && (
        <div className="relative mb-4 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/90 to-white p-4 animate-fade-up">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setWelcomeDismissed(true)}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-teal-950">İlk fişini tara!</p>
              <p className="mt-1 text-sm text-teal-900/80">
                Market fişi veya banka ekran görüntüsü yükle; ürünler ve tutarlar
                otomatik çıkar. Kaydetmeden önce kontrol edebilirsin.
              </p>
            </div>
          </div>
        </div>
      )}

      {(mode === "chooser" || loading) &&
        !(
          reviewId &&
          (reviewRoute.state === "loading" || reviewRoute.state === "review")
        ) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/70 p-2">
            <button
              type="button"
              onClick={() => setSourceHint("receipt")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                sourceHint === "receipt"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Fiş / fiş fotoğrafı
            </button>
            <button
              type="button"
              onClick={() => setSourceHint("bank_screenshot")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                sourceHint === "bank_screenshot"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Banka ekranı
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => cameraRef.current?.click()}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Fotoğraf çek</p>
              <p className="text-sm text-muted-foreground">
                Kamerayla fiş veya ekranı tara
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => galleryRef.current?.click()}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Galeriden yükle</p>
              <p className="text-sm text-muted-foreground">
                Mevcut bir görsel seç
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={startManual}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-200 text-stone-700">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Manuel gir</p>
              <p className="text-sm text-muted-foreground">
                Tutarı kendin yaz
              </p>
            </div>
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-4 text-sm text-teal-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              {sourceHint === "receipt"
                ? "Receipt Engine analiz ediliyor..."
                : "Görsel iyileştirilip analiz ediliyor..."}
            </div>
          )}

          {error && (
            <ErrorRecoveryCard
              message={error}
              onRetry={() => {
                setError(null);
                scanStartRef.current = null;
              }}
              onManual={startManual}
              onGallery={() => galleryRef.current?.click()}
            />
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      )}

      {mode === "engine-result" && enginePurchase && engineValidation && (
        <ReceiptEngineResult
          purchase={enginePurchase}
          validation={engineValidation}
          imageDataUrl={engineImageUrl ?? draft?.imageDataUrl ?? undefined}
          ocrRawText={draft?.rawText ?? undefined}
          rawVisionResponse={engineRawVision || parserPayload?.rawVisionResponse}
          analyzeResult={parserPayload ?? undefined}
          stageTimings={parserPayload?.performance}
          onBack={() => {
            setMode("review");
          }}
        />
      )}

      {(mode === "review" || mode === "manual") && draft && (
        <div className="space-y-4">
          <ReviewForm
            initial={draft}
            saving={saving}
            deleting={deleting}
            compactProducts={mode === "review"}
            summaryFirst={mode === "review"}
            correctionsApplied={correctionsApplied}
            debugSlot={
              mode === "review" && showDebugClipboard && parserPayload ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEnginePurchase(parserPayload.purchase);
                      setEngineValidation(parserPayload.validation);
                      setEngineImageUrl(draft.imageDataUrl);
                      setEngineRawVision(parserPayload.rawVisionResponse ?? "");
                      setMode("engine-result");
                    }}
                  >
                    Parser detayını göster
                  </Button>
                  {draft.rawText?.trim() && (
                    <CopyAllDebugButton
                      purchase={parserPayload.purchase}
                      validation={parserPayload.validation}
                      ocrText={draft.rawText.trim()}
                      rawVisionResponse={parserPayload.rawVisionResponse ?? ""}
                      analyzeResult={parserPayload}
                      stageTimings={parserPayload.performance}
                    />
                  )}
                  {ocrSummary && (
                    <OcrResultSummary
                      productCount={ocrSummary.productCount}
                      reviewCount={ocrSummary.reviewCount}
                      totalVerified={ocrSummary.totalVerified}
                      ocrConfidence={ocrSummary.ocrConfidence}
                      mathValidationPassed={ocrSummary.mathValidationPassed}
                      issues={ocrSummary.issues}
                    />
                  )}
                  {draft.rawText?.trim() && (
                    <OcrTextPanel text={draft.rawText} collapsible />
                  )}
                  {draft.aiResponseJson?.trim() && (
                    <OcrTextPanel
                      title="Parser sonucu"
                      text={prettyJson(draft.aiResponseJson)}
                      collapsible
                      defaultOpen
                      variant="code"
                      maxHeightClassName="max-h-72"
                    />
                  )}
                </>
              ) : undefined
            }
            saveLabel={
              awaitingReceiptReview ? "Onayla & Kaydet" : undefined
            }
            deleteLabel={
              awaitingReceiptReview ? "Fişi Sil" : "İptal Et"
            }
            onDelete={
              awaitingReceiptReview ? handleDeletePending : undefined
            }
            onCancel={() => {
              setMode("chooser");
              setDraft(null);
              setOcrBaseline(null);
              setOcrSummary(null);
            }}
            onSave={handleSave}
          />
        </div>
      )}

      {mode === "chooser" && !loading && (
        <div className="mt-6">
          <Button variant="ghost" className="w-full" onClick={() => router.push("/")}>
            Vazgeç
          </Button>
        </div>
      )}
        </>
      )}
    </AppShell>
  );
}

export default function AddPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppShell>
      }
    >
      <AddPageInner />
    </Suspense>
  );
}
