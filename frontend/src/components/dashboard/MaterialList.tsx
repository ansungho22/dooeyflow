import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/format";
import type { Material } from "@/lib/types";

interface MaterialListProps {
  materials: Material[];
}

export function MaterialList({ materials }: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-sunken px-6 py-12 text-center">
        <p className="text-sm text-text-muted">
          아직 등록된 원자재가 없습니다. 위에서 추가해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised shadow-card">
      <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-5 py-2">
        <span className="text-xs font-medium text-text-muted">원자재</span>
        <span className="text-xs font-medium text-text-muted">현재고 / 안전재고</span>
      </div>
      <ul className="divide-y divide-border">
        {materials.map((material) => (
        <li
          key={material.id}
          className={cn(
            "flex items-center justify-between gap-4 px-5 py-4 transition-colors",
            material.is_low_stock && "bg-danger-soft/60",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-semibold">{material.name}</p>
            {material.is_low_stock && (
              <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
                부족
              </span>
            )}
          </div>

          {/* 현재고 / 안전재고 분수 형태 (예: 3 / 2 g) */}
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span
              className={cn(
                "tabular text-lg font-bold",
                material.is_low_stock ? "text-danger" : "text-text",
              )}
            >
              {formatQuantity(material.current_stock)}
            </span>
            <span className="tabular text-sm text-text-muted">
              / {formatQuantity(material.safety_stock)}
            </span>
            {material.unit && (
              <span className="ml-0.5 text-sm text-text-muted">{material.unit}</span>
            )}
          </div>
        </li>
        ))}
      </ul>
    </div>
  );
}
