"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function PurchaseSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const go = (raw: string) => {
    const q = raw.trim();
    router.push(`/memory${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="group relative"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ne ödemiştim…"
        enterKeyHint="search"
        aria-label="Satın alma hafızasında ara"
        className="h-12 w-full rounded-2xl border border-border/60 bg-card pl-12 pr-4 text-base shadow-sm outline-none transition duration-200 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}
