import { Skeleton } from "@/components/ui/skeleton";

export function TrendsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-11 w-28" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
