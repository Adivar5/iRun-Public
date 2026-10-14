import { Skeleton } from "@/components/ui/skeleton";

export function RunsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-11 w-24" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-28" />
      <Skeleton className="h-[76px] w-full" />
      <Skeleton className="h-[76px] w-full" />
      <Skeleton className="h-[76px] w-full" />
      <Skeleton className="h-[76px] w-full" />
    </div>
  );
}
