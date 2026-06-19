"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddMaterialForm } from "@/components/dashboard/AddMaterialForm";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { StatCard } from "@/components/dashboard/StatCard";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { Card } from "@/components/ui/Card";
import { deleteMaterial, listMaterials } from "@/lib/api";
import { useActiveStore, useRefreshTrigger } from "@/lib/StoreContext";
import type { Material } from "@/lib/types";

export default function DashboardPage() {
  const store = useActiveStore();
  const refreshTrigger = useRefreshTrigger();
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

  async function handleDelete(materialId: number): Promise<void> {
    await deleteMaterial(store.id, materialId);
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
  }

  function handleMaterialUpdated(updated: Material): void {
    setMaterials((prev) =>
      prev
        .map((m) => (m.id === updated.id ? updated : m))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="등록 원자재" value={materials.length} unit="개" />
        <StatCard
          label="부족 재고"
          value={lowStockCount}
          unit="개"
          tone={lowStockCount > 0 ? "danger" : "default"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-heading font-bold">원자재 추가</h2>
        <Card>
          <AddMaterialForm storeId={store.id} onAdded={handleMaterialAdded} />
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-heading font-bold">재고 현황</h2>
          {lowStockCount > 0 && (
            <span className="text-sm font-bold text-danger">
              {lowStockCount}개 보충 필요
            </span>
          )}
        </div>
        {loading ? (
          <p className="px-1 text-sm text-text-subtle">불러오는 중…</p>
        ) : (
          <MaterialList
            storeId={store.id}
            materials={materials}
            onDelete={handleDelete}
            onUpdated={handleMaterialUpdated}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-heading font-bold">최근 변동 이력</h2>
        <Card>
          <TransactionHistory
            storeId={store.id}
            materials={materials}
            refreshTrigger={refreshTrigger}
          />
        </Card>
      </section>
    </main>
  );
}
