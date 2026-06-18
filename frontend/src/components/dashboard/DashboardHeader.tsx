"use client";

import { AppNav } from "@/components/dashboard/AppNav";
import { Button } from "@/components/ui/Button";
import type { Store } from "@/lib/types";

interface DashboardHeaderProps {
  store: Store;
  stores: Store[];
  onSelectStore: (store: Store) => void;
  onLogout: () => void;
}

export function DashboardHeader({
  store,
  stores,
  onSelectStore,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-5">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-accent">Dooeyflow</span>
            {stores.length > 1 ? (
              <select
                value={store.id}
                onChange={(e) => {
                  const next = stores.find((s) => s.id === Number(e.target.value));
                  if (next) onSelectStore(next);
                }}
                aria-label="매장 선택"
                className="rounded-md bg-surface-sunken px-2.5 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-bold text-text">{store.name}</span>
            )}
          </div>
          <Button variant="ghost" onClick={onLogout} className="px-3 py-1.5 text-sm">
            로그아웃
          </Button>
        </div>
        <div className="-mb-px overflow-x-auto pb-0">
          <AppNav />
        </div>
      </div>
    </header>
  );
}
