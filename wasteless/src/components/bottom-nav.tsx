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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-[color:var(--surface)]/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
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
                "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-200 active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
