"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verify: (password: string) => Promise<boolean>;
};

export function KbPasswordDialog({ open, onClose, onSuccess, verify }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const ok = await verify(password);
    setLoading(false);
    setPassword("");
    if (ok) {
      onSuccess();
      onClose();
    } else {
      setError("Yanlış şifre. Erişim reddedildi.");
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Kapat"
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby={titleId}
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 shadow-xl transition-all dark:bg-zinc-900",
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <h2 id={titleId} className="font-display text-lg font-semibold">
          Administrator Password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ürün kataloğu yönetimine erişmek için şifre girin.
        </p>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="kb-admin-password">Şifre</Label>
          <Input
            ref={inputRef}
            id="kb-admin-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="********"
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            İptal
          </Button>
          <Button
            className="flex-1"
            disabled={loading || !password}
            onClick={() => void submit()}
          >
            {loading ? "Kontrol…" : "Devam"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
