"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function PrivacyPage() {
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
        <h1 className="font-display text-2xl tracking-tight">Gizlilik</h1>
      </header>

      <article className="space-y-4 rounded-2xl border border-white/70 bg-white/75 p-4 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Yerel depolama</h2>
          <p>
            WasteLess harcama kayıtlarınızı yalnızca cihazınızda (IndexedDB)
            saklar. Hesap oluşturma veya bulut senkronu yoktur.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Fiş analizi</h2>
          <p>
            Fiş tarama sırasında görsel, analiz amacıyla sunucu üzerinden AI
            API&apos;sine gönderilir. Orijinal görsel, OCR metni ve ham yanıt
            cihazınızda kalır.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Analitik</h2>
          <p>
            Beta döneminde kullanım olayları yalnızca localStorage&apos;da
            tutulur; üçüncü taraf analitik SDK kullanılmaz.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Veri silme</h2>
          <p>
            Ayarlar → Tüm verileri temizle ile tüm yerel veriyi silebilirsiniz.
          </p>
        </section>
        <p className="text-xs">
          Bu metin beta sürümü için minimal bir özetidir. Resmi politika
          yayınlandığında güncellenecektir.
        </p>
      </article>
    </AppShell>
  );
}
