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
    <main className="mx-auto max-w-3xl space-y-7 px-5 py-7">
      <div>
        <h2 className="text-heading font-bold">판매 일괄 입력</h2>
        <p className="mt-1 text-sm text-text-muted">
          장사 마감 후 메뉴별 판매 수량을 입력하면 레시피대로 재고가 자동 차감됩니다.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중…</p>
      ) : menus.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-sunken px-6 py-12 text-center text-sm text-text-muted">
          먼저 메뉴·레시피를 등록해 주세요.
        </div>
      ) : (
        <>
          <Card className="divide-y divide-border p-0">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div>
                  <p className="font-semibold">{menu.name}</p>
                  <p className="text-xs text-text-muted">{formatWon(menu.price)}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={quantities[menu.id] || ""}
                  onChange={(e) => setQuantity(menu.id, e.target.value)}
                  placeholder="0"
                  aria-label={`${menu.name} 판매 수량`}
                  className="tabular w-24 rounded border border-border bg-surface-raised px-3 py-2 text-right focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            ))}
          </Card>

          {error && (
            <p className="rounded bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">
              {totalItems > 0 ? `총 ${totalItems}잔 차감 예정` : "수량을 입력하세요"}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={submitting || lines.length === 0}
            >
              {submitting ? "차감 중…" : "재고 차감"}
            </Button>
          </div>

          {result && <BatchSaleResultView result={result} />}
        </>
      )}
    </main>
  );
}
