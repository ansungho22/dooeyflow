"use client";

import { useEffect, useState } from "react";
import { MenuRecipeEditor } from "@/components/menus/MenuRecipeEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  ApiError,
  createMenu,
  deleteMenu,
  listMaterials,
  listMenus,
} from "@/lib/api";
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

  async function handleDeleteMenu(menu: Menu): Promise<void> {
    if (!window.confirm(`'${menu.name}' 메뉴를 삭제할까요?`)) return;
    await deleteMenu(store.id, menu.id);
    setMenus((prev) => prev.filter((m) => m.id !== menu.id));
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
        <div className="rounded-lg bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-accent-strong">
          레시피에는 <b>메뉴 1개를 팔 때 쓰는 양</b>만 적으면 됩니다 (예: 아메리카노 →
          원두 20g). 재고 수량과 무관하게 적어 두면, <b>판매 입력 시 재고에서 자동으로
          차감</b>됩니다. 재고와 <b>같은 단위</b>로 적어 주세요.
        </div>
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-bold">{menu.name}</h3>
                    <span className="tabular text-sm font-semibold text-text-muted">
                      {formatWon(menu.price)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMenu(menu)}
                    aria-label={`${menu.name} 메뉴 삭제`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path
                        d="M5 5l10 10M15 5L5 15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
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
