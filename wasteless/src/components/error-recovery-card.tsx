"use client";

import Link from "next/link";
import { AlertTriangle, Camera, Clock, Copy, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorRecoveryPreset =
  | "camera_denied"
  | "offline"
  | "ocr_fail"
  | "unreadable"
  | "duplicate_hint"
  | "timeout"
  | "generic";

type RecoveryConfig = {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  primaryAction: "retry" | "manual" | "gallery" | "settings";
  secondaryLabel?: string;
  secondaryAction?: "manual" | "gallery";
};

const PRESETS: Record<ErrorRecoveryPreset, RecoveryConfig> = {
  camera_denied: {
    icon: <Camera className="h-5 w-5" />,
    title: "Kamera izni gerekli",
    description:
      "Fiş taramak için kamera erişimine izin ver veya galeriden bir görsel seç.",
    primaryLabel: "Galeriden yükle",
    primaryAction: "gallery",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  offline: {
    icon: <WifiOff className="h-5 w-5" />,
    title: "İnternet bağlantısı yok",
    description:
      "Fiş analizi sunucu üzerinden yapılır. Bağlantını kontrol et veya manuel giriş yap.",
    primaryLabel: "Tekrar dene",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  ocr_fail: {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Analiz başarısız",
    description:
      "Fiş okunamadı. Işığı artır, fotoğrafı düz çek veya manuel giriş yap.",
    primaryLabel: "Tekrar dene",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  unreadable: {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Fiş okunamıyor",
    description:
      "Görsel bulanık veya eksik olabilir. Daha net bir fotoğraf dene.",
    primaryLabel: "Tekrar dene",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  duplicate_hint: {
    icon: <Copy className="h-5 w-5" />,
    title: "Benzer kayıt olabilir",
    description:
      "Bu fiş daha önce eklenmiş olabilir. Geçmişe bak veya yine de ekle.",
    primaryLabel: "Geçmişe bak",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  timeout: {
    icon: <Clock className="h-5 w-5" />,
    title: "İşlem zaman aşımına uğradı",
    description:
      "Analiz çok uzun sürdü. Bağlantını kontrol et ve tekrar dene.",
    primaryLabel: "Tekrar dene",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
  generic: {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Bir hata oluştu",
    description: "Beklenmeyen bir sorun oluştu. Tekrar deneyebilir veya manuel girebilirsin.",
    primaryLabel: "Tekrar dene",
    primaryAction: "retry",
    secondaryLabel: "Manuel gir",
    secondaryAction: "manual",
  },
};

export function mapErrorToPreset(message: string): ErrorRecoveryPreset {
  const lower = message.toLocaleLowerCase("tr-TR");
  if (
    lower.includes("kamera") ||
    lower.includes("camera") ||
    lower.includes("permission") ||
    lower.includes("izin")
  ) {
    return "camera_denied";
  }
  if (
    lower.includes("offline") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("bağlantı") ||
    lower.includes("internet")
  ) {
    return "offline";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("zaman aşım") ||
    lower.includes("timed out")
  ) {
    return "timeout";
  }
  if (
    lower.includes("duplicate") ||
    lower.includes("benzer") ||
    lower.includes("zaten")
  ) {
    return "duplicate_hint";
  }
  if (
    lower.includes("okunam") ||
    lower.includes("unreadable") ||
    lower.includes("bulanık") ||
    lower.includes("net değil")
  ) {
    return "unreadable";
  }
  if (
    lower.includes("ocr") ||
    lower.includes("analiz") ||
    lower.includes("parse") ||
    lower.includes("başarısız")
  ) {
    return "ocr_fail";
  }
  return "generic";
}

export function ErrorRecoveryCard({
  message,
  preset,
  onRetry,
  onManual,
  onGallery,
  className,
}: {
  message?: string;
  preset?: ErrorRecoveryPreset;
  onRetry?: () => void;
  onManual?: () => void;
  onGallery?: () => void;
  className?: string;
}) {
  const resolved = preset ?? (message ? mapErrorToPreset(message) : "generic");
  const config = PRESETS[resolved];

  const handlePrimary = () => {
    switch (config.primaryAction) {
      case "retry":
        onRetry?.();
        break;
      case "manual":
        onManual?.();
        break;
      case "gallery":
        onGallery?.();
        break;
      default:
        onRetry?.();
    }
  };

  const handleSecondary = () => {
    if (config.secondaryAction === "manual") onManual?.();
    else if (config.secondaryAction === "gallery") onGallery?.();
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-4 text-sm text-rose-950",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700 shadow-sm">
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{config.title}</p>
          <p className="mt-1 text-rose-900/90">{config.description}</p>
          {message && resolved === "generic" && (
            <p className="mt-2 rounded-lg bg-white/60 px-2 py-1 text-xs text-rose-800">
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {resolved === "duplicate_hint" ? (
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link href="/history">Geçmişe bak</Link>
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handlePrimary}>
            {config.primaryAction === "retry" && (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {config.primaryLabel}
          </Button>
        )}
        {config.secondaryLabel && (
          <Button type="button" size="sm" variant="outline" onClick={handleSecondary}>
            {config.secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
