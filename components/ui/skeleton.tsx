// built to spec, 21st id 23557 pending
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-card bg-surface-2", className)} />;
}
