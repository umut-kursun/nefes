"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Keyboard, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
import { analysisToExpenseDraft, createManualExpense, purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
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
import { OcrResultSummary } from "@/components/ocr-result-summary";
import { OcrTextPanel } from "@/components/ocr-text-panel";
import type { AnalysisResult, Expense } from "@/lib/types";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";

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

export default function AddPage() {
  const router = useRouter();
  const { addExpense, categories } = useWasteLessStore();
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("chooser");
  const [draft, setDraft] = useState<Expense | null>(null);
  /** Unedited OCR draft — used to detect user corrections on save. */
  const [ocrBaseline, setOcrBaseline] = useState<Expense | null>(null);
  const [correctionsApplied, setCorrectionsApplied] = useState(0);
  const [ocrSummary, setOcrSummary] = useState<{
    productCount: number;
    reviewCount: number;
    totalVerified: boolean;
    issues: ReturnType<typeof findLineItemIssues>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sourceHint, setSourceHint] = useState<"receipt" | "bank_screenshot">(
    "receipt"
  );
  const [enginePurchase, setEnginePurchase] = useState<PurchaseDraft | null>(
    null
  );
  const [engineValidation, setEngineValidation] =
    useState<ValidationReportGolden | null>(null);
  const [engineImageUrl, setEngineImageUrl] = useState<string | null>(null);
  const [engineDebugExport, setEngineDebugExport] =
    useState<ReceiptDebugExport | null>(null);

  const analyzeWithReceiptEngine = async (file: File) => {
    setLoading(true);
    setError(null);
    setEnginePurchase(null);
    setEngineValidation(null);
    setEngineImageUrl(null);
    setEngineDebugExport(null);
    try {
      const t0 = performance.now();
      const originalDataUrl = await fileToDataUrl(file);
      const enhanced = await preprocessReceiptImage(file, "enhanced");
      const threshold = await preprocessReceiptImage(file, "threshold");
      const preprocessMs = Math.round(performance.now() - t0);

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
      body.append("sourceHint", "receipt");
      body.append("preprocessMs", String(preprocessMs));

      const res = await fetch("/api/receipt-engine", {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Receipt Engine analizi başarısız");
      }

      setEnginePurchase(json.purchase as PurchaseDraft);
      setEngineValidation(json.validation as ValidationReportGolden);
      setEngineImageUrl(
        typeof json.imageDataUrl === "string" ? json.imageDataUrl : originalDataUrl
      );
      setEngineDebugExport(
        json.debugExport && typeof json.debugExport === "object"
          ? (json.debugExport as ReceiptDebugExport)
          : null
      );

      const ocrRawText =
        typeof json.ocrRawText === "string"
          ? json.ocrRawText
          : (json.purchase as PurchaseDraft)?.provenance?.rawTexts
              ?.filter(Boolean)
              .join("\n") ?? "";

      const purchase = json.purchase as PurchaseDraft;
      const validation = json.validation as ValidationReportGolden;
      const parserJson = JSON.stringify(
        {
          purchase,
          validation,
        },
        null,
        2
      );

      const next = purchaseDraftToExpenseDraft(purchase, {
        imageDataUrl:
          typeof json.imageDataUrl === "string"
            ? json.imageDataUrl
            : originalDataUrl,
        ocrRawText,
        categories,
        parserJson,
      });

      const rawBaseline = JSON.parse(JSON.stringify(next)) as Expense;
      setOcrBaseline(rawBaseline);
      setCorrectionsApplied(0);

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
        issues,
      });

      setDraft(next);
      // Review form shows OCR summary + editable fields (PWA production path).
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
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
      const t0 = performance.now();
      const originalDataUrl = await fileToDataUrl(file);
      const enhanced = await preprocessReceiptImage(file, "enhanced");
      const threshold = await preprocessReceiptImage(file, "threshold");
      const preprocessMs = Math.round(performance.now() - t0);
      if (process.env.NODE_ENV === "development") {
        console.info(`[receipt] preprocess: ${preprocessMs}ms`);
      }

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
        issues,
      });

      setDraft(next);
      setMode("review");
    } catch (err) {
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
    if (file) await analyzeFile(file);
  };

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
        if (rows.length) await saveOcrCorrections(rows);

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
      await addExpense(expense);
      toast("Harcama kaydedildi", "success");
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-5">
        <h1 className="font-display text-2xl tracking-tight">Harcama ekle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fiş, banka ekran görüntüsü veya hızlı manuel giriş
        </p>
      </header>

      {(mode === "chooser" || loading) && (
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
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
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
          imageDataUrl={engineImageUrl ?? undefined}
          debugExport={engineDebugExport ?? undefined}
          ocrRawText={draft?.rawText ?? undefined}
          onBack={() => {
            setMode("chooser");
            setEnginePurchase(null);
            setEngineValidation(null);
            setEngineImageUrl(null);
            setEngineDebugExport(null);
            setError(null);
          }}
        />
      )}

      {(mode === "review" || mode === "manual") && draft && (
        <div className="space-y-4">
          {mode === "review" && ocrSummary && (
            <OcrResultSummary
              productCount={ocrSummary.productCount}
              reviewCount={ocrSummary.reviewCount}
              totalVerified={ocrSummary.totalVerified}
              issues={ocrSummary.issues}
            />
          )}
          {mode === "review" && draft.rawText?.trim() && (
            <OcrTextPanel text={draft.rawText} collapsible />
          )}
          {mode === "review" && draft.aiResponseJson?.trim() && (
            <OcrTextPanel
              title="Parser sonucu"
              text={prettyJson(draft.aiResponseJson)}
              collapsible
              defaultOpen
              variant="code"
              maxHeightClassName="max-h-72"
            />
          )}
          {mode === "review" && (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-3 text-sm text-muted-foreground">
              AI çıkarımı hazır. Kaydetmeden önce düzenleyebilirsiniz.
              {correctionsApplied > 0 && (
                <p className="mt-1 text-teal-800">
                  Önceki düzeltmen uygulandı ({correctionsApplied}).
                </p>
              )}
            </div>
          )}
          <ReviewForm
            initial={draft}
            saving={saving}
            compactProducts={mode === "review"}
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
    </AppShell>
  );
}
