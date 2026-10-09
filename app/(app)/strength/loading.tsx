import { Skeleton } from "@/components/ui/skeleton";

export default function StrengthLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-[82px] w-full" />
      <Skeleton className="h-[82px] w-full" />
      <Skeleton className="h-[82px] w-full" />
      <Skeleton className="h-[82px] w-full" />
    </div>
  );
}
