"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError, updateMaterial } from "@/lib/api";
import type { Material } from "@/lib/types";
import {
  COMMON_UNITS,
  parseInputToBaseUnit,
  formatForDisplay,
  getDisplayUnit,
} from "@/lib/units";

interface EditMaterialModalProps {
  storeId: number;
  material: Material;
  onClose: () => void;
  onUpdated: (material: Material) => void;
}

export function EditMaterialModal({
  storeId,
  material,
  onClose,
  onUpdated,
}: EditMaterialModalProps) {
  const displayUnit = getDisplayUnit(material.unit);

  const [name, setName] = useState(material.name);
  const [unit, setUnit] = useState(displayUnit);
  const [currentStock, setCurrentStock] = useState(
    formatForDisplay(material.current_stock, material.unit)
  );
  const [safetyStock, setSafetyStock] = useState(
    formatForDisplay(material.safety_stock, material.unit)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const baseUnit = COMMON_UNITS.find((u) => u.value === unit)?.base ?? unit;
      const updated = await updateMaterial(storeId, material.id, {
        name,
        unit: baseUnit,
        current_stock: parseInputToBaseUnit(currentStock, unit),
        safety_stock: parseInputToBaseUnit(safetyStock, unit),
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">원자재 수정</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="원자재 이름"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Select
            label="단위"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={COMMON_UNITS}
          />

          <Input
            label="현재 재고"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            suffix={unit}
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
          />

          <Input
            label="안전 재고"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            suffix={unit}
            hint="이 수량 이하로 떨어지면 알림을 받습니다."
            value={safetyStock}
            onChange={(e) => setSafetyStock(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
