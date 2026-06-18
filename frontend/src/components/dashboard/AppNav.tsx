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
              "relative px-3 py-2.5 text-sm font-bold transition-colors",
              active ? "text-accent" : "text-text-subtle hover:text-text",
            )}
          >
            {link.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
