import { Skeleton } from "@/components/ui/skeleton";

export function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-[248px] w-full" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-[280px] w-full" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
