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
  const [error, setError] = useState<string | null>(null);

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
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-7">
      <section className="space-y-4">
        <h2 className="text-heading font-bold">메뉴 추가</h2>
        <Card>
          <form
            onSubmit={handleCreateMenu}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end"
          >
            <Input
              label="메뉴명"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="아메리카노"
            />
            <Input
              label="가격"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="4500"
            />
            <Input
              label="POS 코드 (선택)"
              value={posCode}
              onChange={(e) => setPosCode(e.target.value)}
              placeholder="토스 연동 시"
            />
            <Button type="submit">메뉴 추가</Button>
            {error && (
              <p className="col-span-2 text-sm text-danger sm:col-span-4">{error}</p>
            )}
          </form>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading font-bold">메뉴 · 레시피</h2>
        {loading ? (
          <p className="text-sm text-text-muted">불러오는 중…</p>
        ) : menus.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-sunken px-6 py-12 text-center text-sm text-text-muted">
            아직 메뉴가 없습니다. 위에서 추가해 보세요.
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-sunken px-6 py-8 text-center text-sm text-text-muted">
            레시피를 등록하려면 먼저 재고 현황에서 원자재를 추가하세요.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {menus.map((menu) => (
              <Card key={menu.id} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold">{menu.name}</h3>
                  <span className="tabular text-sm text-text-muted">
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
