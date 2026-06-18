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
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-raised shadow-card">
      {materials.map((material) => (
        <li
          key={material.id}
          className={cn(
            "flex items-center justify-between gap-4 px-5 py-4 transition-colors",
            material.is_low_stock && "bg-danger-soft/60",
          )}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{material.name}</p>
            <p className="text-xs text-text-muted">
              안전재고 {formatQuantity(material.safety_stock)}
              {material.unit}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {material.is_low_stock && (
              <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">
                부족
              </span>
            )}
            <div className="text-right">
              <span
                className={cn(
                  "tabular text-lg font-bold",
                  material.is_low_stock ? "text-danger" : "text-text",
                )}
              >
                {formatQuantity(material.current_stock)}
              </span>
              <span className="ml-0.5 text-sm text-text-muted">
                {material.unit}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
