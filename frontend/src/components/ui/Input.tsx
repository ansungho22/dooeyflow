import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  suffix?: ReactNode;
}

export function Input({ label, hint, suffix, className, id, ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-text-muted">
          {label}
        </span>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          className={cn(
            "w-full rounded bg-surface-sunken px-4 py-3 text-text",
            "placeholder:text-text-subtle",
            "border border-transparent transition-colors",
            "focus:border-accent focus:bg-surface-raised focus:outline-none",
            suffix ? "pr-12" : "",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 text-sm font-medium text-text-subtle">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-text-subtle">{hint}</p>}
    </label>
  );
}
