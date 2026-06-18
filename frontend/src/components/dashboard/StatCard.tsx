import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "danger";
}

export function StatCard({ label, value, unit, tone = "default" }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            "tabular text-stat font-bold leading-none",
            tone === "danger" ? "text-danger" : "text-text",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-text-subtle">{unit}</span>}
      </span>
    </Card>
  );
}
