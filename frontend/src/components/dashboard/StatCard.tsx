import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  tone?: "default" | "danger";
  hint?: string;
}

export function StatCard({ label, value, tone = "default", hint }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <span
        className={cn(
          "tabular text-stat font-bold leading-none",
          tone === "danger" ? "text-danger" : "text-text",
        )}
      >
        {value}
      </span>
      {hint && <span className="mt-1 text-xs text-text-muted">{hint}</span>}
    </Card>
  );
}
