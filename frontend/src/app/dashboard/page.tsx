"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddMaterialForm } from "@/components/dashboard/AddMaterialForm";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { StatCard } from "@/components/dashboard/StatCard";
import { StoreSetup } from "@/components/dashboard/StoreSetup";
import { listMaterials } from "@/lib/api";
import type { Material } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useStore } from "@/lib/useStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const {
    stores,
    activeStore,
    loading: storeLoading,
    selectStore,
    addStore,
  } = useStore(Boolean(user));

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // 인증되지 않은 사용자는 로그인으로
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadMaterials = useCallback(async (storeId: number): Promise<void> => {
    setMaterialsLoading(true);
    try {
      setMaterials(await listMaterials(storeId));
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStore) loadMaterials(activeStore.id);
  }, [activeStore, loadMaterials]);

  const lowStockCount = useMemo(
    () => materials.filter((m) => m.is_low_stock).length,
    [materials],
  );

  function handleMaterialAdded(material: Material): void {
    setMaterials((prev) =>
      [...prev, material].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-text-muted">
        불러오는 중…
      </div>
    );
  }

  if (!user) return null;

  if (!activeStore) {
    return <StoreSetup onCreate={addStore} />;
  }

  return (
    <div className="min-h-dvh">
      <DashboardHeader
        store={activeStore}
        stores={stores}
        onSelectStore={selectStore}
        onLogout={logout}
      />

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
            value={activeStore.toss_enabled ? "토스 연동" : "수동 관리"}
            hint={activeStore.name}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-heading font-bold">원자재 추가</h2>
          <AddMaterialForm
            storeId={activeStore.id}
            onAdded={handleMaterialAdded}
          />
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
          {materialsLoading ? (
            <p className="text-sm text-text-muted">불러오는 중…</p>
          ) : (
            <MaterialList materials={materials} />
          )}
        </section>
      </main>
    </div>
  );
}
