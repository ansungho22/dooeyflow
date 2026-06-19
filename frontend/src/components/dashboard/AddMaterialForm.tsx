"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError, createMaterial } from "@/lib/api";
import type { Material } from "@/lib/types";
import { toBaseUnit, UNIT_OPTIONS } from "@/lib/units";

interface AddMaterialFormProps {
  storeId: number;
  onAdded: (material: Material) => void;
}

const DEFAULT_UNIT = "g";

export function AddMaterialForm({ storeId, onAdded }: AddMaterialFormProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [currentStock, setCurrentStock] = useState("");
  const [safetyStock, setSafetyStock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // kg/L 등 변환되는 단위를 골랐을 때만 변환 미리보기를 보여준다.
  const preview = currentStock ? toBaseUnit(currentStock, unit) : null;
  const converted = preview && preview.unit !== unit ? preview : null;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // kg/L 입력은 기본 단위(g/ml)로 변환해 저장한다 (DB는 항상 기본 단위).
      const current = toBaseUnit(currentStock || "0", unit);
      const safety = toBaseUnit(safetyStock || "0", unit);
      const material = await createMaterial(storeId, {
        name,
        unit: current.unit,
        current_stock: current.value,
        safety_stock: safety.value,
      });
      onAdded(material);
      setName("");
      setUnit(DEFAULT_UNIT);
      setCurrentStock("");
      setSafetyStock("");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Input
            label="원자재 이름"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="원두"
          />
        </div>
        <Select
          label="단위"
          options={UNIT_OPTIONS}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <Input
          label="현재고"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          autoComplete="off"
          suffix={unit}
          value={currentStock}
          onChange={(e) => setCurrentStock(e.target.value)}
          placeholder="0"
        />
        <Input
          label="안전재고"
          hint="이 수량 이하로 떨어지면 알림"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          autoComplete="off"
          suffix={unit}
          value={safetyStock}
          onChange={(e) => setSafetyStock(e.target.value)}
          placeholder="0"
        />
      </div>
      {converted && currentStock && (
        <p className="rounded bg-accent-soft px-3 py-2 text-xs font-medium text-accent-strong">
          {currentStock}
          {unit} → <b>{converted.value}{converted.unit}</b>로 저장됩니다 (정확한 계산을
          위해 {converted.unit} 단위로 관리)
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? "추가 중…" : "원자재 추가"}
      </Button>
    </form>
  );
}
