"use client";

import { useEffect, useState } from "react";
import { MenuRecipeEditor } from "@/components/menus/MenuRecipeEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, createMenu, listMaterials, listMenus } from "@/lib/api";
import { formatWon } from "@/lib/format";
import { useActiveStore } from "@/lib/StoreContext";
import type { Material, Menu } from "@/lib/types";

export default function MenusPage() {
  const store = useActiveStore();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [posCode, setPosCode] = useState("");
  const [showPos, setShowPos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listMenus(store.id), listMaterials(store.id)])
      .then(([menuData, materialData]) => {
        if (!active) return;
        setMenus(menuData);
        setMaterials(materialData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store.id]);

  async function handleCreateMenu(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const menu = await createMenu(store.id, {
        name,
        price: price || "0",
        pos_menu_code: posCode || null,
      });
      setMenus((prev) => [...prev, menu]);
      setName("");
      setPrice("");
      setPosCode("");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "메뉴 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
      <section className="space-y-3">
        <h2 className="px-1 text-heading font-bold">메뉴 추가</h2>
        <Card className="space-y-3">
          <form onSubmit={handleCreateMenu} className="space-y-3">
            <Input
              label="메뉴 이름"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="아메리카노"
            />
            <Input
              label="판매 가격"
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              autoComplete="off"
              suffix="원"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="4500"
            />

            {showPos ? (
              <Input
                label="POS 코드"
                hint="토스 POS 자동 차감용. 수동 입력만 쓰면 비워두세요."
                autoComplete="off"
                value={posCode}
                onChange={(e) => setPosCode(e.target.value)}
                placeholder="예: AMR"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowPos(true)}
                className="text-sm font-semibold text-accent hover:text-accent-strong"
              >
                + 토스 POS 코드 입력 (선택)
              </button>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "추가 중…" : "메뉴 추가"}
            </Button>
          </form>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-heading font-bold">메뉴 · 레시피</h2>
        {loading ? (
          <p className="px-1 text-sm text-text-subtle">불러오는 중…</p>
        ) : menus.length === 0 ? (
          <div className="rounded-lg bg-surface-raised px-6 py-14 text-center text-sm text-text-subtle shadow-card">
            아직 메뉴가 없습니다. 위에서 추가해 보세요.
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-lg bg-surface-raised px-6 py-10 text-center text-sm text-text-subtle shadow-card">
            레시피를 등록하려면 먼저 재고 현황에서 원자재를 추가하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {menus.map((menu) => (
              <Card key={menu.id} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">{menu.name}</h3>
                  <span className="tabular text-sm font-semibold text-text-muted">
                    {formatWon(menu.price)}
                  </span>
                </div>
                <MenuRecipeEditor
                  storeId={store.id}
                  menu={menu}
                  materials={materials}
                />
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
