import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/format";
import type { BatchSaleResult } from "@/lib/types";

interface BatchSaleResultViewProps {
  result: BatchSaleResult;
}

/** 일괄 차감 결과: 원자재별 소비량 + 부족 경고. */
export function BatchSaleResultView({ result }: BatchSaleResultViewProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ok text-sm text-white">
          ✓
        </span>
        <h3 className="font-bold">차감 완료</h3>
      </div>

      {result.low_stock_materials.length > 0 && (
        <div className="rounded bg-danger-soft px-4 py-3">
          <p className="text-sm font-bold text-danger">
            {result.low_stock_materials.length}개 원자재가 안전재고 이하입니다
          </p>
          <p className="mt-1 text-xs text-danger/80">
            {result.low_stock_materials.map((m) => m.material_name).join(", ")} — 보충이
            필요합니다.
          </p>
        </div>
      )}

      <ul className="space-y-1">
        {result.changes.map((change) => (
          <li
            key={change.material_id}
            className="flex items-center justify-between py-1.5 text-sm"
          >
            <span className="font-semibold">{change.material_name}</span>
            <div className="flex items-center gap-3">
              <span className="tabular text-text-subtle">
                −{formatQuantity(change.consumed)}
              </span>
              <span
                className={cn(
                  "tabular font-bold",
                  change.is_low_stock ? "text-danger" : "text-text",
                )}
              >
                {formatQuantity(change.remaining_stock)} 남음
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
