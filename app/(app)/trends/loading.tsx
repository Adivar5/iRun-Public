import { Skeleton } from "@/components/ui/skeleton";

export default function TrendsLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
