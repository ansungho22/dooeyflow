import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong active:bg-accent-strong",
  secondary:
    "bg-surface-sunken text-text hover:bg-border/60 active:bg-border/60",
  ghost: "text-text-muted hover:bg-surface-sunken active:bg-surface-sunken",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

const SIZES: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm rounded",
  lg: "px-5 py-3.5 text-base rounded-[14px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold",
        "transition-all duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
