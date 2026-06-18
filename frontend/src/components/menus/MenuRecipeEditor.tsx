"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  ApiError,
  addRecipeItem,
  deleteRecipeItem,
  listRecipes,
} from "@/lib/api";
import { formatQuantity } from "@/lib/format";
import type { Material, Menu, Recipe } from "@/lib/types";

interface MenuRecipeEditorProps {
  storeId: number;
  menu: Menu;
  materials: Material[];
}

/** 메뉴 1개의 레시피(원자재 소모량) 항목을 추가/삭제한다. */
export function MenuRecipeEditor({
  storeId,
  menu,
  materials,
}: MenuRecipeEditorProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materialId, setMaterialId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listRecipes(storeId, menu.id)
      .then((data) => {
        if (active) setRecipes(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, menu.id]);

  const materialName = (id: number): string =>
    materials.find((m) => m.id === id)?.name ?? `#${id}`;
  const materialUnit = (id: number): string =>
    materials.find((m) => m.id === id)?.unit ?? "";

  const selectedUnit = materialId === "" ? "" : materialUnit(materialId);

  async function handleAdd(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (materialId === "") return;
    setError(null);
    try {
      const recipe = await addRecipeItem(storeId, menu.id, {
        material_id: materialId,
        quantity_per_unit: quantity,
      });
      setRecipes((prev) => [...prev, recipe]);
      setMaterialId("");
      setQuantity("");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    }
  }

  async function handleDelete(recipeId: number): Promise<void> {
    await deleteRecipeItem(storeId, menu.id, recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }

  const availableMaterials = materials.filter(
    (m) => !recipes.some((r) => r.material_id === m.id),
  );

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-text-subtle">레시피 불러오는 중…</p>
      ) : recipes.length === 0 ? (
        <p className="rounded bg-surface-sunken px-3.5 py-3 text-sm text-text-subtle">
          이 메뉴 1개를 팔 때 소모되는 원자재를 추가해 주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between rounded bg-surface-sunken px-3.5 py-2.5"
            >
              <span className="font-semibold">
                {materialName(recipe.material_id)}
              </span>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm font-semibold text-text-muted">
                  {formatQuantity(recipe.quantity_per_unit)}
                  {materialUnit(recipe.material_id)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(recipe.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                  aria-label={`${materialName(recipe.material_id)} 삭제`}
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <path
                      d="M5 5l10 10M15 5L5 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {availableMaterials.length > 0 && (
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <select
                value={materialId}
                onChange={(e) =>
                  setMaterialId(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                aria-label="원자재 선택"
                className="h-full w-full appearance-none rounded bg-surface-sunken px-3.5 py-2.5 pr-9 text-sm focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">원자재 선택</option>
                {availableMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative w-28">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoComplete="off"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="수량"
                aria-label="메뉴 1개당 소모량"
                className="tabular w-full rounded bg-surface-sunken py-2.5 pl-3.5 pr-9 text-right text-sm focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-subtle">
                {selectedUnit || ""}
              </span>
            </div>
            <Button type="submit" variant="secondary" className="shrink-0">
              추가
            </Button>
          </div>
          <p className="text-xs text-text-subtle">
            메뉴 1개당 소모량 (예: 원두 18, 우유 150). 정수·소수 모두 가능.
          </p>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
