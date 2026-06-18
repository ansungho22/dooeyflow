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

  // 현재 선택된 원자재의 단위 (소모량 입력 옆에 표시)
  const selectedUnit =
    materialId === "" ? "" : materialUnit(materialId);

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

  // 이미 등록된 원자재는 선택지에서 제외 (중복 방지)
  const availableMaterials = materials.filter(
    (m) => !recipes.some((r) => r.material_id === m.id),
  );

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-text-muted">레시피 불러오는 중…</p>
      ) : recipes.length === 0 ? (
        <p className="text-sm text-text-muted">
          소모되는 원자재를 추가해 주세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between rounded bg-surface-sunken px-3 py-2 text-sm"
            >
              <span className="font-medium">{materialName(recipe.material_id)}</span>
              <div className="flex items-center gap-3">
                <span className="tabular text-text-muted">
                  {formatQuantity(recipe.quantity_per_unit)}
                  {materialUnit(recipe.material_id)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(recipe.id)}
                  className="text-text-muted transition-colors hover:text-danger"
                  aria-label={`${materialName(recipe.material_id)} 삭제`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {availableMaterials.length > 0 && (
        <form onSubmit={handleAdd} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={materialId}
              onChange={(e) =>
                setMaterialId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              aria-label="원자재 선택"
              className="flex-1 rounded border border-border bg-surface-raised px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">원자재 선택</option>
              {availableMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
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
                className="tabular w-24 rounded border border-border bg-surface-raised px-2.5 py-2 text-right text-sm focus:border-accent focus:outline-none"
              />
              {/* 선택한 원자재 단위를 표시해 입력 단위를 명확히 한다 */}
              <span className="w-8 text-sm text-text-muted">
                {selectedUnit || "단위"}
              </span>
            </div>
            <Button type="submit" variant="secondary" className="px-3 py-2">
              추가
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            메뉴 1개를 팔 때 소모되는 양 (예: 원두 18, 우유 150). 정수·소수 모두 가능.
          </p>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
