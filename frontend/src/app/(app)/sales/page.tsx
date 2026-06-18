"use client";

import { useEffect, useMemo, useState } from "react";
import { BatchSaleResultView } from "@/components/sales/BatchSaleResultView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ApiError, batchSale, listMenus } from "@/lib/api";
import { formatWon } from "@/lib/format";
import { useActiveStore } from "@/lib/StoreContext";
import type { BatchSaleResult, Menu, SaleLine } from "@/lib/types";

export default function SalesPage() {
  const store = useActiveStore();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchSaleResult | null>(null);

  useEffect(() => {
    let active = true;
    listMenus(store.id)
      .then((data) => {
        if (active) setMenus(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store.id]);

  function setQuantity(menuId: number, value: string): void {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    setQuantities((prev) => ({ ...prev, [menuId]: qty }));
  }

  const lines = useMemo<SaleLine[]>(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([menuId, qty]) => ({ menu_id: Number(menuId), quantity_sold: qty })),
    [quantities],
  );

  const totalItems = lines.reduce((sum, line) => sum + line.quantity_sold, 0);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await batchSale(store.id, lines);
      setResult(res);
      setQuantities({});
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "차감에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <div className="px-1">
        <h2 className="text-heading font-bold">판매 일괄 입력</h2>
        <p className="mt-1 text-sm text-text-muted">
          마감 후 메뉴별 판매 수량을 입력하면 레시피대로 재고가 자동 차감됩니다.
        </p>
      </div>

      {loading ? (
        <p className="px-1 text-sm text-text-subtle">불러오는 중…</p>
      ) : menus.length === 0 ? (
        <div className="rounded-lg bg-surface-raised px-6 py-14 text-center text-sm text-text-subtle shadow-card">
          먼저 메뉴·레시피를 등록해 주세요.
        </div>
      ) : (
        <>
          <Card className="p-0">
            {menus.map((menu, idx) => (
              <div
                key={menu.id}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{menu.name}</p>
                  <p className="tabular text-xs text-text-subtle">
                    {formatWon(menu.price)}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quantities[menu.id] || ""}
                  onChange={(e) => setQuantity(menu.id, e.target.value)}
                  placeholder="0"
                  aria-label={`${menu.name} 판매 수량`}
                  className="tabular w-24 rounded bg-surface-sunken px-3 py-2.5 text-right text-lg font-bold focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </Card>

          {error && (
            <p className="rounded bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <div className="sticky bottom-4 space-y-2">
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={submitting || lines.length === 0}
              className="w-full shadow-card"
            >
              {submitting
                ? "차감 중…"
                : totalItems > 0
                  ? `${totalItems}잔 재고 차감`
                  : "수량을 입력하세요"}
            </Button>
          </div>

          {result && <BatchSaleResultView result={result} />}
        </>
      )}
    </main>
  );
}
