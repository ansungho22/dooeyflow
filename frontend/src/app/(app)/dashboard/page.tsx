"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddMaterialForm } from "@/components/dashboard/AddMaterialForm";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { StatCard } from "@/components/dashboard/StatCard";
import { listMaterials } from "@/lib/api";
import { useActiveStore } from "@/lib/StoreContext";
import type { Material } from "@/lib/types";

export default function DashboardPage() {
  const store = useActiveStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMaterials = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setMaterials(await listMaterials(store.id));
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const lowStockCount = useMemo(
    () => materials.filter((m) => m.is_low_stock).length,
    [materials],
  );

  function handleMaterialAdded(material: Material): void {
    setMaterials((prev) =>
      [...prev, material].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-7">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="등록 원자재" value={materials.length} hint="총 품목 수" />
        <StatCard
          label="부족 재고"
          value={lowStockCount}
          tone={lowStockCount > 0 ? "danger" : "default"}
          hint="안전재고 이하"
        />
        <StatCard
          label="매장"
          value={store.toss_enabled ? "토스 연동" : "수동 관리"}
          hint={store.name}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-heading font-bold">원자재 추가</h2>
        <AddMaterialForm storeId={store.id} onAdded={handleMaterialAdded} />
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-heading font-bold">재고 현황</h2>
          {lowStockCount > 0 && (
            <span className="text-sm font-semibold text-danger">
              {lowStockCount}개 품목 보충 필요
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-text-muted">불러오는 중…</p>
        ) : (
          <MaterialList materials={materials} />
        )}
      </section>
    </main>
  );
}
