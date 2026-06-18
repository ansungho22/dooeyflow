import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-text-muted">
          {label}
        </span>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded border border-border bg-surface-raised px-3.5 py-2.5",
          "text-text placeholder:text-text-muted/60",
          "transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
          className,
        )}
        {...props}
      />
    </label>
  );
}
