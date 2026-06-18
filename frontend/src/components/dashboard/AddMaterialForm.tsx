"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError, createMaterial } from "@/lib/api";
import type { Material } from "@/lib/types";
import { UNIT_OPTIONS } from "@/lib/units";

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

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const material = await createMaterial(storeId, {
        name,
        unit,
        current_stock: currentStock || "0",
        safety_stock: safetyStock || "0",
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? "추가 중…" : "원자재 추가"}
      </Button>
    </form>
  );
}
