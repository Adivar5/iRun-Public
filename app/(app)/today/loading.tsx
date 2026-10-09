import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-[248px] w-full" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
