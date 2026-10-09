import { Skeleton } from "@/components/ui/skeleton";

export default function RunsLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-28" />
      <Skeleton className="h-[88px] w-full" />
      <Skeleton className="h-[88px] w-full" />
      <Skeleton className="h-[88px] w-full" />
      <Skeleton className="h-[88px] w-full" />
    </div>
  );
}
