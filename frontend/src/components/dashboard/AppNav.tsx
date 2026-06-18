"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "재고 현황" },
  { href: "/menus", label: "메뉴·레시피" },
  { href: "/sales", label: "판매 입력" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="flex gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-accent-soft text-accent-strong"
                : "text-text-muted hover:text-text hover:bg-surface-sunken",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
