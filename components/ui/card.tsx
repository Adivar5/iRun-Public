// built to spec
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const PAD = {
  hero: "bg-surface-2 p-5",
  standard: "bg-surface-1 p-4",
  compact: "bg-surface-1 px-3 py-2",
} as const;

export function Card({
  as: Tag = "div",
  variant = "standard",
  className,
  children,
}: {
  as?: "div" | "section" | "article";
  variant?: keyof typeof PAD;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-line shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
        PAD[variant],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
