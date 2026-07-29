"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Money / amount field that starts empty (not "0"), so the user can type
 * "10" without first deleting a leading zero.
 */
export function AmountInput({
  id,
  value,
  onChange,
  className,
  placeholder = "0",
  allowEmpty = true,
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  /** When true, a stored 0 renders as empty until the user types. */
  allowEmpty?: boolean;
}) {
  const format = (n: number | null | undefined) => {
    if (n == null) return "";
    if (allowEmpty && n === 0) return "";
    return String(n);
  };

  const [text, setText] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, allowEmpty]);

  const parse = (raw: string): number => {
    const normalized = raw.replace(",", ".").trim();
    if (normalized === "" || normalized === ".") return 0;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      className={cn("font-amount tabular-nums", className)}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const n = parse(text);
        onChange(n);
        setText(format(n));
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next !== "" && !/^\d*[.,]?\d*$/.test(next)) return;
        setText(next);
        onChange(parse(next));
      }}
    />
  );
}
