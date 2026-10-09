import { Suspense } from "react";

import { TrendsChrome, TrendsRest, TrendsVolumeCard } from "@/components/trends/trends-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrends, getVolumeTrend, parseTrendRange } from "@/lib/data/trends";
import { supabaseServer } from "@/lib/supabase/server";

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const parsed = parseTrendRange(range);
  return (
    <div className="flex flex-col gap-4">
      <TrendsChrome range={parsed} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <VolumeSection range={parsed} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
        <RestSection range={parsed} />
      </Suspense>
    </div>
  );
}

async function VolumeSection({ range }: { range: ReturnType<typeof parseTrendRange> }) {
  const view = await getVolumeTrend(await supabaseServer(), range);
  return <TrendsVolumeCard view={view} />;
}

async function RestSection({ range }: { range: ReturnType<typeof parseTrendRange> }) {
  const view = await getTrends(await supabaseServer(), range);
  return <TrendsRest view={view} />;
}
