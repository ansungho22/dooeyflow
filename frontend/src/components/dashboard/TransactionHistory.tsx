"use client";

import { useEffect, useState } from "react";
import { listTransactions } from "@/lib/api";
import { formatQuantity } from "@/lib/format";
import type { InventoryTransaction, Material } from "@/lib/types";
import { formatForDisplay, getDisplayUnit } from "@/lib/units";

type Props = {
  storeId: number;
  materials: Material[];
  refreshTrigger: number;
};

const REASON_LABELS: Record<InventoryTransaction["reason_code"], string> = {
  SALE: "판매",
  WASTE: "폐기",
  AUDIT: "실사",
  CANCEL: "취소",
};

export function TransactionHistory({ storeId, materials, refreshTrigger }: Props) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listTransactions(storeId)
      .then((data) => setTransactions(data.slice(0, 30)))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [storeId, refreshTrigger]);

  const materialMap = new Map(materials.map((m) => [m.id, m]));

  if (loading) {
    return <p className="text-sm text-text-muted">불러오는 중…</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-text-muted">변동 이력이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.map((tx) => {
        const material = materialMap.get(tx.material_id);
        const qty = parseFloat(tx.quantity_changed);
        const isPositive = qty > 0;
        const unit = material?.unit ?? "";
        const displayQty = unit
          ? formatQuantity(formatForDisplay(Math.abs(qty).toString(), unit))
          : formatQuantity(Math.abs(qty).toString());
        const displayUnit = unit ? getDisplayUnit(unit) : "";

        return (
          <li key={tx.id} className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-10 rounded px-1.5 py-0.5 text-center text-xs font-medium ${
                  tx.reason_code === "SALE"
                    ? "bg-accent-soft text-accent"
                    : tx.reason_code === "WASTE"
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-muted text-text-subtle"
                }`}
              >
                {REASON_LABELS[tx.reason_code]}
              </span>
              <span className="font-medium">
                {material?.name ?? `재료 #${tx.material_id}`}
              </span>
            </div>
            <span
              className={`tabular font-bold ${isPositive ? "text-ok" : "text-danger"}`}
            >
              {isPositive ? "+" : "−"}
              {displayQty}
              {displayUnit}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
