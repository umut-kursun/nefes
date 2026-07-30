"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function TermsPage() {
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
        <h1 className="font-display text-2xl tracking-tight">Kullanım koşulları</h1>
      </header>

      <article className="space-y-4 rounded-2xl border border-white/70 bg-white/75 p-4 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Beta yazılım</h2>
          <p>
            WasteLess beta aşamasındadır. Özellikler değişebilir; OCR ve
            ayrıştırma hataları olabilir. Kaydetmeden önce fiş verilerini
            kontrol etmeniz önerilir.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Sorumluluk</h2>
          <p>
            Uygulama &quot;olduğu gibi&quot; sunulur. Harcama ve vergi
            kayıtları için resmi belgelerinizi esas alın; WasteLess finansal
            danışmanlık sağlamaz.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-foreground">Fikri mülkiyet</h2>
          <p>
            WasteLess markası ve yazılımı geliştiriciye aittir. Tersine
            mühendislik veya yetkisiz dağıtım yasaktır.
          </p>
        </section>
        <p className="text-xs">
          Bu metin beta sürümü için taslaktır. Resmi koşullar yayınlandığında
          güncellenecektir.
        </p>
      </article>
    </AppShell>
  );
}
