import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-[102px] w-full" />
    </div>
  );
}
