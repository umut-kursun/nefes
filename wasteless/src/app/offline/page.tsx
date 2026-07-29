import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(15,118,110,0.14),transparent_55%),linear-gradient(180deg,#F4F7F5_0%,#EEF2F0_100%)]" />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
        <WifiOff className="h-6 w-6" />
      </div>
      <h1 className="font-display text-3xl tracking-tight">Çevrimdışı</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Bağlantı yok. Daha önce açtığın sayfalar ve yerel kayıtların cihazında
        duruyor. Fiş analizi için internet gerekir.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
