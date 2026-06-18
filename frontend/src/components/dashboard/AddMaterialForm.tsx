"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, createMaterial } from "@/lib/api";
import type { Material } from "@/lib/types";

interface AddMaterialFormProps {
  storeId: number;
  onAdded: (material: Material) => void;
}

export function AddMaterialForm({ storeId, onAdded }: AddMaterialFormProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
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
      setUnit("");
      setCurrentStock("");
      setSafetyStock("");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end"
    >
      <div className="col-span-2 sm:col-span-1">
        <Input
          label="원자재"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="원두"
        />
      </div>
      <Input
        label="단위"
        required
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="g"
      />
      <Input
        label="현재고"
        type="number"
        min="0"
        step="0.0001"
        value={currentStock}
        onChange={(e) => setCurrentStock(e.target.value)}
        placeholder="0"
      />
      <Input
        label="안전재고"
        type="number"
        min="0"
        step="0.0001"
        value={safetyStock}
        onChange={(e) => setSafetyStock(e.target.value)}
        placeholder="0"
      />
      <Button type="submit" disabled={submitting} className="col-span-2 sm:col-span-1">
        {submitting ? "추가 중…" : "추가"}
      </Button>
      {error && (
        <p className="col-span-2 text-sm text-danger sm:col-span-5">{error}</p>
      )}
    </form>
  );
}
