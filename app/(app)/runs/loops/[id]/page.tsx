import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectingState } from "@/components/charts/collecting-state";
import { LoopOverlay } from "@/components/runs/loop-overlay";
import { RenameLoop } from "@/components/runs/rename-loop";
import { formatLocalDay, formatPace } from "@/lib/format";
import { getLoop, loopRoutes } from "@/lib/data/loops";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LoopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id } = await params;
  const { run } = await searchParams;
  const sb = await supabaseServer();
  const loaded = await getLoop(sb, id);
  if (!loaded) notFound();
  const { loop, attempts } = loaded;
  const best = [...attempts].sort((a, b) => a.paceSPerKm - b.paceSPerKm)[0];
  const chosen = attempts.find((attempt) => attempt.id === run) ?? attempts[0];
  const routes =
    best && chosen ? await loopRoutes(sb, [...new Set([best.id, chosen.id])]) : [];
  const routeFor = (workoutId: string) => routes.find((route) => route.id === workoutId) ?? { lat: null, lon: null };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/runs/loops" className="inline-flex min-h-11 items-center text-base text-accent-ink">
        All loops
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-ink">{loop.name}</h1>
        <RenameLoop id={loop.id} name={loop.name} />
      </div>
      {attempts.length < 2 ? (
        <CollectingState have={attempts.length} need={2} what="runs on the same loop" />
      ) : (
        <>
          <p className="text-base text-ink">
            Loop best <span className="num">{formatPace(loop.bestPaceS)}</span> per km
          </p>
          {best && chosen ? <LoopOverlay pb={routeFor(best.id)} chosen={routeFor(chosen.id)} /> : null}
          <ul className="flex flex-col gap-2">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <Link
                  href={`/runs/loops/${loop.id}?run=${attempt.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-card border border-line px-3 text-base text-ink"
                >
                  <span>{formatLocalDay(attempt.startAt)}</span>
                  <span className="num">{formatPace(attempt.paceSPerKm)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
