"use client";

import { useState } from "react";
import { EditMaterialModal } from "@/components/dashboard/EditMaterialModal";
import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/format";
import type { Material } from "@/lib/types";

interface MaterialListProps {
  storeId: number;
  materials: Material[];
  onDelete: (materialId: number) => Promise<void>;
  onUpdated: (material: Material) => void;
}

export function MaterialList({
  storeId,
  materials,
  onDelete,
  onUpdated,
}: MaterialListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  if (materials.length === 0) {
    return (
      <div className="rounded-lg bg-surface-raised px-6 py-14 text-center shadow-card">
        <p className="text-sm text-text-subtle">
          아직 등록된 원자재가 없습니다. 위에서 추가해 보세요.
        </p>
      </div>
    );
  }

  async function handleDelete(material: Material): Promise<void> {
    if (!window.confirm(`'${material.name}'을(를) 삭제할까요?`)) return;
    setDeletingId(material.id);
    try {
      await onDelete(material.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg bg-surface-raised shadow-card">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <span className="text-xs font-semibold text-text-subtle">원자재</span>
        <span className="text-xs font-semibold text-text-subtle">
          현재고 / 안전재고
        </span>
      </div>
      <ul>
        {materials.map((material) => (
          <li
            key={material.id}
            className={cn(
              "group flex items-center justify-between gap-3 border-t border-border px-5 py-4",
              material.is_low_stock && "bg-danger-soft/40",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold">{material.name}</span>
              {material.is_low_stock && (
                <span className="shrink-0 rounded-md bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                  부족
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* 현재고 / 안전재고 (단위 한 번만 표기) */}
              <button
                type="button"
                onClick={() => setEditingMaterial(material)}
                className="flex items-baseline gap-1 whitespace-nowrap rounded-md px-2 py-1 transition-colors hover:bg-accent-soft"
              >
                <span
                  className={cn(
                    "tabular text-xl font-bold",
                    material.is_low_stock ? "text-danger" : "text-text",
                  )}
                >
                  {formatQuantity(material.current_stock)}
                </span>
                <span className="tabular text-sm text-text-subtle">
                  / {formatQuantity(material.safety_stock)} {material.unit}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(material)}
                disabled={deletingId === material.id}
                aria-label={`${material.name} 삭제`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
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
          </li>
        ))}
      </ul>

      {editingMaterial && (
        <EditMaterialModal
          storeId={storeId}
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}
