import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex min-h-11 items-center justify-between gap-3", className)}>
      <h1 className="font-display text-screen font-semibold text-ink">{title}</h1>
      {action}
    </header>
  );
}
