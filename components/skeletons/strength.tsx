import { Skeleton } from "@/components/ui/skeleton";

export function StrengthSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-11 w-28" />
      <Skeleton className="h-[96px] w-full" />
      <Skeleton className="h-[96px] w-full" />
      <Skeleton className="h-[96px] w-full" />
      <Skeleton className="h-[96px] w-full" />
    </div>
  );
}
