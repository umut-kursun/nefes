"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast";
import {
  FEEDBACK_TYPE_LABELS,
  submitBetaFeedback,
  type BetaFeedbackType,
} from "@/lib/beta-feedback";

const TYPES: BetaFeedbackType[] = [
  "ocr_mistake",
  "parsing_wrong",
  "feature",
  "rating",
];

export default function FeedbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<BetaFeedbackType>("feature");
  const [message, setMessage] = useState("");
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast("Mesaj gerekli", "danger");
      return;
    }
    setSaving(true);
    try {
      submitBetaFeedback({
        type,
        message,
        attachReceipt,
        screen: "feedback",
      });
      toast("Geri bildirim kaydedildi — teşekkürler!", "success");
      router.push("/settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Geri"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.05] bg-white shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl tracking-tight">Geri bildirim</h1>
          <p className="text-sm text-muted-foreground">
            Beta deneyimini bizimle paylaş
          </p>
        </div>
      </header>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label>Tür</Label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                  type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-black/[0.08] bg-white text-foreground/80"
                }`}
              >
                {FEEDBACK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="message">Mesaj</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ne oldu, ne bekliyordun?"
            rows={5}
            maxLength={2000}
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={attachReceipt}
            onChange={(e) => setAttachReceipt(e.target.checked)}
            className="h-4 w-4 rounded border-black/20"
          />
          <span>Son tarama meta verisini ekle (güven skoru, sürüm)</span>
        </label>

        <p className="text-xs text-muted-foreground">
          Geri bildirimler cihazında saklanır. Ayarlardan JSON olarak dışa
          aktarabilirsin — sunucuya otomatik gönderilmez.
        </p>

        <Button type="submit" className="w-full gap-2" disabled={saving}>
          <Send className="h-4 w-4" />
          {saving ? "Kaydediliyor…" : "Gönder"}
        </Button>
      </form>
    </AppShell>
  );
}
