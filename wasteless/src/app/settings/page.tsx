"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { KbPasswordDialog } from "@/components/kb-manager/kb-password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWasteLessStore } from "@/hooks/use-store";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import {
  APP_VERSION,
  applyAppUpdate,
  fetchRemoteVersion,
} from "@/lib/app-version";
import { verifyKbAdminPassword } from "@/lib/product-knowledge/adminAuth";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, exportData, wipeData, expenses } =
    useWasteLessStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [dark, setDark] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);

  useEffect(() => {
    setDark(settings.theme === "dark");
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  useEffect(() => {
    setNameDraft(settings.displayName ?? "");
  }, [settings.displayName]);

  useEffect(() => {
    void fetchRemoteVersion().then((remote) => {
      if (remote?.version) setRemoteVersion(remote.version);
    });
  }, []);

  const onTheme = async (checked: boolean) => {
    setDark(checked);
    await updateSettings({
      ...settings,
      theme: checked ? "dark" : "light",
    });
  };

  const onSaveName = async () => {
    const next = nameDraft.trim() || null;
    if ((settings.displayName ?? null) === next) return;
    await updateSettings({ ...settings, displayName: next });
    toast(next ? "Ad kaydedildi" : "Ad kaldırıldı", "success");
  };

  const onExport = async () => {
    const data = await exportData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wasteless-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Veriler dışa aktarıldı.");
  };

  const onClear = async () => {
    const ok = await confirm({
      title: "Tüm veriler silinsin mi?",
      description:
        "Tüm harcama, etiket ve hızlı buton verileri temizlenecek. Bu işlem geri alınamaz.",
      confirmLabel: "Sil",
      cancelLabel: "İptal",
      destructive: true,
    });
    if (!ok) return;
    await wipeData();
    toast("Veriler temizlendi", "danger");
    setMessage("Veriler temizlendi. Varsayılan hızlı butonlar yeniden eklendi.");
  };

  const onUpdate = async () => {
    setUpdating(true);
    setMessage("Güncelleme kontrol ediliyor…");
    try {
      const remote = await fetchRemoteVersion();
      if (remote?.version) setRemoteVersion(remote.version);
      await applyAppUpdate();
    } catch {
      setUpdating(false);
      setMessage("Güncelleme uygulanamadı. Bağlantını kontrol et.");
    }
  };

  return (
    <AppShell>
      <header className="mb-5">
        <h1 className="font-display text-2xl tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Minimal gizlilik odaklı yerel depolama
        </p>
      </header>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Sürüm</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {APP_VERSION}
              {remoteVersion && remoteVersion !== APP_VERSION
                ? ` · sunucu ${remoteVersion}`
                : ""}
            </p>
          </div>
          <Button
            onClick={() => void onUpdate()}
            disabled={updating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
            Güncelle
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Yeni sürüm yayınlandığında Güncelle ile uygulamayı yenile.
        </p>
      </section>

      <section className="mb-4 space-y-4 rounded-2xl border border-white/70 bg-white/75 p-4">
        <div className="grid gap-2">
          <Label htmlFor="displayName">Adın</Label>
          <p className="text-xs text-muted-foreground">
            Ana sayfa selamlamasında kullanılır (isteğe bağlı)
          </p>
          <Input
            id="displayName"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void onSaveName()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Örn. Umut"
            maxLength={40}
            className="h-11"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="theme">Koyu tema</Label>
            <p className="text-xs text-muted-foreground">İsteğe bağlı görünüm</p>
          </div>
          <Switch id="theme" checked={dark} onCheckedChange={onTheme} />
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
          Kayıtlı harcama: <strong>{expenses.length}</strong>
        </div>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Akıllı içgörüler</h2>
        <p className="text-sm text-muted-foreground">
          Yerel harcama verinden çıkan alışkanlık ve fiyat desenleri.
        </p>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/insights">İçgörüleri aç</Link>
        </Button>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Kategoriler</h2>
        <p className="text-sm text-muted-foreground">
          Market, sağlık, giyim… kategorilerini yönet.
        </p>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/categories">Kategorileri aç</Link>
        </Button>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Etiketler</h2>
        <p className="text-sm text-muted-foreground">
          Weekend Trip, Eskişehir, Vacation 2026…
        </p>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/tags">Etiketleri aç</Link>
        </Button>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Hızlı butonlar</h2>
        <p className="text-sm text-muted-foreground">
          Tek dokunuşluk harcama kısayollarını yönet.
        </p>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/quick-buttons">Hızlı butonları aç</Link>
        </Button>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">📦 Product Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Ürün kataloğu, markalar ve global OCR eşleşmeleri.
        </p>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => setKbDialogOpen(true)}
        >
          Update Product Catalog
        </Button>
      </section>

      <section className="mb-4 space-y-3 rounded-2xl border border-white/70 bg-white/75 p-4">
        <h2 className="font-semibold">Veri</h2>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => void onExport()}
        >
          Verileri dışa aktar
        </Button>
        <Button
          className="w-full"
          variant="destructive"
          onClick={() => void onClear()}
        >
          Tüm verileri temizle
        </Button>
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/75 p-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">Gizlilik notu</h2>
        Harcama kayıtlarınız bu cihazda IndexedDB içinde tutulur. Fiş analizi
        sırasında görsel, yalnızca analiz için sunucu üzerinden OpenAI
        API&apos;ye gönderilir. Bulut senkronu veya hesap sistemi yoktur.
        Orijinal görsel, OCR metni ve ham AI yanıtı cihazda saklanır.
      </section>

      {message && (
        <p className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {message}
        </p>
      )}

      <KbPasswordDialog
        open={kbDialogOpen}
        onClose={() => setKbDialogOpen(false)}
        verify={verifyKbAdminPassword}
        onSuccess={() => router.push("/settings/product-knowledge")}
      />
    </AppShell>
  );
}
