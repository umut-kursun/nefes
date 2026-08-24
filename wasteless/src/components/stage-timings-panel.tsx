"use client";

import {
  formatStageTimingsSection,
  type ReceiptStageTimings,
} from "@/lib/receipt-engine-debug/formatStageTimings";

type Props = {
  timings: ReceiptStageTimings;
  title?: string;
  defaultOpen?: boolean;
};

function parseDisplayLines(section: string): string[] {
  return section
    .split("\n")
    .slice(1)
    .filter((line) => line.trim() && !line.startsWith("{"))
    .filter((line) => line.trim() !== "(no timing data)");
}

export function StageTimingsPanel({
  timings,
  title = "Stage timings",
  defaultOpen = true,
}: Props) {
  const section = formatStageTimingsSection(timings);
  const lines = parseDisplayLines(section);

  if (lines.length === 0) return null;

  return (
    <details
      className="rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
        {title}
      </summary>
      <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line.trim()}</li>
        ))}
      </ul>
    </details>
  );
}
