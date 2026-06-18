"use client";

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
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-accent">Dooeyflow</span>
          {stores.length > 1 ? (
            <select
              value={store.id}
              onChange={(e) => {
                const next = stores.find((s) => s.id === Number(e.target.value));
                if (next) onSelectStore(next);
              }}
              className="rounded border border-border bg-surface-raised px-2.5 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-semibold">{store.name}</span>
          )}
        </div>
        <Button variant="ghost" onClick={onLogout} className="px-3 py-1.5">
          로그아웃
        </Button>
      </div>
    </header>
  );
}
