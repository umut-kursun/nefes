"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Home, PlusCircle, Settings2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/memory", label: "Hafıza", icon: Brain },
  { href: "/add", label: "Ekle", icon: PlusCircle },
  { href: "/tags", label: "Etiketler", icon: Tag },
  { href: "/settings", label: "Ayarlar", icon: Settings2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/50",
        "bg-[color:var(--surface)]/68 backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--surface)]/58",
        "pb-[env(safe-area-inset-bottom)]",
        "shadow-[0_-6px_28px_rgba(15,23,42,0.07)]"
      )}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-0.5 pt-0.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/memory"
                ? pathname.startsWith("/memory") ||
                  pathname.startsWith("/calendar")
                : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5",
                "text-[10.5px] font-medium leading-none tracking-tight",
                "transition-all duration-200 active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] shrink-0 transition-transform duration-200",
                  active && "scale-105"
                )}
                strokeWidth={active ? 2.35 : 2}
              />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
