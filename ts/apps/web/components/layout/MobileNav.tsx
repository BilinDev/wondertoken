"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/design/icons";
import { NAV_ITEMS, isNavActive } from "./nav";

/** Fixed bottom navigation for small screens. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-[65] grid grid-cols-5 border-t border-line bg-surface px-2 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 desk:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-[10px] no-underline transition-colors hover:no-underline",
              active ? "text-mint" : "text-ink-3",
            )}
          >
            <NavIcon icon={item.icon} size={20} />
            <span className="text-[11px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
