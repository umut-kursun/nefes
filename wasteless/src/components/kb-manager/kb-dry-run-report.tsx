"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ImportDryRunReport } from "@/lib/product-knowledge/import/types";
import { cn } from "@/lib/utils";

function Section({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-white/70 bg-white/60">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium">
          {title}{" "}
          <span className="text-muted-foreground">({count})</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="max-h-64 overflow-y-auto border-t px-4 py-3 text-sm">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function KbDryRunReport({ report }: { report: ImportDryRunReport }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/50 p-4 text-sm">
        <p className="font-semibold">Import Summary</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
          <dt className="text-muted-foreground">Total Rows</dt>
          <dd>{report.totalRows}</dd>
          <dt className="text-muted-foreground">New Products</dt>
          <dd>{report.newProducts.length}</dd>
          <dt className="text-muted-foreground">Updated Products</dt>
          <dd>{report.updatedProducts.length}</dd>
          <dt className="text-muted-foreground">Duplicate Products</dt>
          <dd>{report.duplicateProducts.length}</dd>
          <dt className="text-muted-foreground">New Brands</dt>
          <dd>{report.newBrands.length}</dd>
          <dt className="text-muted-foreground">New Categories</dt>
          <dd>{report.newCategories.length}</dd>
          <dt className="text-muted-foreground">New Aliases</dt>
          <dd>{report.newAliases.length}</dd>
          <dt className="text-muted-foreground">Invalid Rows</dt>
          <dd>{report.invalidRows.length}</dd>
          <dt className="text-muted-foreground">Potential Conflicts</dt>
          <dd>{report.conflicts.length}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Dry run · {report.durationMs}ms · hiçbir veri yazılmadı
        </p>
      </div>

      <Section title="New Products Learned" count={report.learnedProducts.length} defaultOpen>
        <ul className="space-y-1">
          {report.learnedProducts.map((p) => (
            <li key={p}>✅ {p}</li>
          ))}
        </ul>
      </Section>

      <Section title="New Aliases Learned" count={report.learnedAliases.length}>
        <ul className="space-y-2">
          {report.learnedAliases.map((a) => (
            <li key={`${a.ocr}-${a.target}`}>
              <div>{a.ocr}</div>
              <div className="text-muted-foreground">↓ {a.target}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Updated Products" count={report.updatedProducts.length}>
        <ul className="space-y-2">
          {report.updatedProducts.map((u) => (
            <li key={u.id}>
              <div>{u.existing}</div>
              <div className="text-muted-foreground">→ {u.imported}</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                {u.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Duplicate Candidates" count={report.duplicateProducts.length}>
        <ul className="space-y-2">
          {report.duplicateProducts.map((d, i) => (
            <li key={`${d.existingId}-${i}`}>
              <div>{d.imported}</div>
              <div className="text-xs text-muted-foreground">
                = {d.existing} · {d.reason}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Potential Conflicts" count={report.conflicts.length}>
        <ul className="space-y-3">
          {report.conflicts.map((c, i) => (
            <li key={`${c.existingId}-${i}`} className="rounded-lg bg-amber-50/80 p-2">
              <div>
                <span className="text-muted-foreground">Existing</span> {c.existing}
              </div>
              <div>
                <span className="text-muted-foreground">Imported</span> {c.imported}
              </div>
              <div className="text-xs text-amber-900">Reason: {c.reason}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Invalid Rows" count={report.invalidRows.length}>
        <ul className="space-y-2">
          {report.invalidRows.map((r) => (
            <li key={r.rowIndex}>
              Satır {r.rowIndex}: {r.reason}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="New Brands" count={report.newBrands.length}>
        <ul className="space-y-1">
          {report.newBrands.map((b) => (
            <li key={b.id}>{b.name}</li>
          ))}
        </ul>
      </Section>

      <Section title="New Categories" count={report.newCategories.length}>
        <ul className="space-y-1">
          {report.newCategories.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
