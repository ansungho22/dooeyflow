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
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
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
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="소모량"
            aria-label="메뉴당 소모량"
            className="w-28 rounded border border-border bg-surface-raised px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <Button type="submit" variant="secondary" className="px-3 py-2">
            추가
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
