"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { KbDryRunReport } from "@/components/kb-manager/kb-dry-run-report";
import { KbFileDropzone } from "@/components/kb-manager/kb-file-dropzone";
import { useToast } from "@/components/toast";
import {
  aiNormalizeImportRow,
  isKbAdminSessionValid,
} from "@/lib/product-knowledge/adminAuth";
import { runImportDryRun } from "@/lib/product-knowledge/import/dryRunPipeline";
import { parseImportFile } from "@/lib/product-knowledge/import/fileParser";
import type {
  ImportApplyPlan,
  ImportDryRunReport,
  KbHealthStats,
  KbImportHistoryEntry,
} from "@/lib/product-knowledge/import/types";
import {
  applyKnowledgeImport,
  computeKbHealth,
  getKbImportHistory,
  loadKnowledgeOverlay,
} from "@/lib/product-knowledge/kbStore";

export default function ProductKnowledgeManagerPage() {
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [health, setHealth] = useState<KbHealthStats | null>(null);
  const [history, setHistory] = useState<KbImportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<ImportDryRunReport | null>(null);
  const [plan, setPlan] = useState<ImportApplyPlan | null>(null);
  const [selectedHistory, setSelectedHistory] =
    useState<KbImportHistoryEntry | null>(null);

  const refreshMeta = useCallback(async () => {
    const overlay = await loadKnowledgeOverlay();
    setHealth(computeKbHealth(overlay));
    setHistory(await getKbImportHistory());
  }, []);

  useEffect(() => {
    if (!isKbAdminSessionValid()) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    void refreshMeta();
  }, [refreshMeta]);

  const onFile = async (file: File) => {
    setLoading(true);
    setReport(null);
    setPlan(null);
    setSelectedHistory(null);
    try {
      const table = await parseImportFile(file);
      const overlay = await loadKnowledgeOverlay();
      const result = await runImportDryRun(
        table,
        overlay,
        aiNormalizeImportRow
      );
      setReport(result.report);
      setPlan(result.plan);
      toast("Dry run tamamlandı — önizlemeyi inceleyin", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Dosya okunamadı",
        "danger"
      );
    } finally {
      setLoading(false);
    }
  };

  const onApply = async () => {
    if (!report || !plan) return;
    setApplying(true);
    try {
      await applyKnowledgeImport(plan, {
        fileName: report.fileName,
        report,
      });
      setReport(null);
      setPlan(null);
      await refreshMeta();
      toast("Ürün kataloğu güncellendi", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "İçe aktarma başarısız",
        "danger"
      );
    } finally {
      setApplying(false);
    }
  };

  const onCancel = () => {
    setReport(null);
    setPlan(null);
    toast("İçe aktarma iptal edildi", "success");
  };

  if (!authorized) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/70 bg-white/75 p-6 text-center">
          <p className="text-muted-foreground">
            Oturum süresi doldu veya erişim reddedildi.
          </p>
          <Button asChild className="mt-4">
            <Link href="/settings">Ayarlara dön</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/settings" aria-label="Geri">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl tracking-tight">
            Product Knowledge Base Manager
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dry run zorunlu — onaylamadan hiçbir veri yazılmaz
          </p>
        </div>
      </header>

      {health ? (
        <section className="mb-4 rounded-2xl border border-white/70 bg-white/75 p-4">
          <h2 className="font-semibold">Knowledge Base Health</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Products</dt>
              <dd className="font-medium">{health.products}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Aliases</dt>
              <dd className="font-medium">{health.aliases}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Brands</dt>
              <dd className="font-medium">{health.brands}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Categories</dt>
              <dd className="font-medium">{health.categories}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duplicate Candidates</dt>
              <dd className="font-medium">{health.duplicateCandidates}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Missing Category</dt>
              <dd className="font-medium">{health.missingCategory}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Missing Package Size</dt>
              <dd className="font-medium">{health.missingPackageSize}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Missing Brand</dt>
              <dd className="font-medium">{health.missingBrand}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deprecated / Merged</dt>
              <dd className="font-medium">
                {health.deprecated} / {health.merged}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="mb-4 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="mb-3 font-semibold">Import Catalog</h2>
        <KbFileDropzone disabled={loading || applying} onFile={(f) => void onFile(f)} />
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dry run çalışıyor…
          </p>
        ) : null}
      </section>

      {report && plan ? (
        <section className="mb-4 space-y-4 rounded-2xl border border-white/70 bg-white/75 p-4">
          <KbDryRunReport report={report} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={applying}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={applying}
              onClick={() => void onApply()}
            >
              {applying ? "Uygulanıyor…" : "Update Knowledge Base"}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Import History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Henüz içe aktarma yok.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full rounded-xl bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted/70"
                  onClick={() => setSelectedHistory(h)}
                >
                  <div className="font-medium">{h.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.importedAt).toLocaleString("tr-TR")} · +
                    {h.productsAdded} / ~{h.productsUpdated} · {h.status} ·{" "}
                    {h.durationMs}ms
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedHistory?.reportSnapshot ? (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm font-medium">Geçmiş özet</p>
            <KbDryRunReport report={selectedHistory.reportSnapshot} />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
