// built to spec, 21st id 140 pending
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { press } from "./press";

const VARIANT = {
  primary:
    "bg-accent-ink text-on-accent shadow-[0_0_24px_rgb(214_242_92/0.35)] [[data-theme=light]_&]:shadow-none hover:bg-accent",
  secondary: "border border-line bg-surface-2 text-ink hover:bg-surface-1",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  destructive: "border border-line bg-transparent text-alert hover:bg-surface-2",
} as const;

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-btn px-4 font-body text-base font-medium disabled:opacity-40",
        press,
        VARIANT[variant],
        className,
      )}
    >
      {loading ? <Icon name="loader-circle" className="animate-spin" /> : null}
      {children}
    </button>
  );
}
