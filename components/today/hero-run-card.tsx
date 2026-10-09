// 21st.dev Workout Summary Card (id 8257). Distance leads, route sits to the right. No like, delete, or rainbow chips.
import type { ReactNode } from "react";
import Link from "next/link";

import { RouteCanvas } from "@/components/charts/route-canvas";
import { Card } from "@/components/ui/card";
import { DeltaChip } from "@/components/ui/delta-chip";
import { Icon } from "@/components/ui/icon";
import { HeroStat } from "@/components/ui/hero-stat";
import { press } from "@/components/ui/press";
import { cn } from "@/lib/cn";
import type { HeroRun } from "@/lib/data/today";
import { formatKm, formatPace } from "@/lib/format";
import type { RunKind } from "@/supabase/functions/_shared/metrics/index.ts";

const KIND_LABEL = {
  easy: "Easy",
  tempo: "Tempo",
  long: "Long",
  intervals: "Intervals",
  other: "Other",
} as const satisfies Record<RunKind, string>;

function PaceDelta({ delta }: { delta: number }) {
  const rounded = Math.round(delta);
  const direction = rounded < 0 ? "down" : rounded > 0 ? "up" : "flat";
  return (
    <DeltaChip
      direction={direction}
      good={rounded === 0 ? null : rounded < 0}
      value={formatPace(Math.abs(rounded))}
      unit="/km"
    />
  );
}

export function HeroRunCard({
  run,
  freshPb = false,
  badge,
  route,
}: {
  run: HeroRun;
  freshPb?: boolean;
  badge?: ReactNode;
  route?: ReactNode;
}) {
  const kind = run.runKind ? KIND_LABEL[run.runKind] : null;
  return (
    <Card variant="hero" className={cn("relative", press)}>
      <Link
        href={`/runs/${run.id}`}
        aria-label={`Open latest run, ${formatKm(run.distanceM)} km`}
        className="absolute inset-0 z-0 rounded-card"
      />
      <div className="pointer-events-none relative z-10 flex flex-nowrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-ink">
            Latest run
            {kind ? <span className="text-ink-muted"> · {kind}</span> : null}
          </p>
          {freshPb ? (
            <p className="mt-2 inline-flex items-center gap-1 text-base text-ink">
              <Icon name="medal" />
              New 5k PB
            </p>
          ) : (
            badge
          )}
          <div className="mt-2">
            <HeroStat value={formatKm(run.distanceM)} unit="km" label="Distance" />
          </div>
          <p className="mt-3 text-ink">
            <span className="num text-[28px] leading-none">{formatPace(run.paceSPerKm)}</span>
            <span className="ml-1 font-mono text-[13px] text-ink-muted">/km</span>
          </p>
          <p className="font-mono text-[13px] text-ink-muted">Pace</p>
          {run.avgHr == null ? (
            <p className="mt-3 text-base text-ink">No heart rate</p>
          ) : (
            <>
              <p className="mt-3 text-ink">
                <span className="num text-[28px] leading-none">{Math.round(run.avgHr)}</span>
                <span className="ml-1 font-mono text-[13px] text-ink-muted">bpm</span>
              </p>
              <p className="font-mono text-[13px] text-ink-muted">Heart rate</p>
            </>
          )}
          {run.deltaVsSimilarSPerKm == null ? null : (
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <PaceDelta delta={run.deltaVsSimilarSPerKm} />
              <span className="text-[13px] text-ink-muted">vs last similar run</span>
            </p>
          )}
        </div>
        <div className="ml-auto w-[88px] shrink-0 pt-1 [&_button]:hidden">
          {route ?? <RouteCanvas lat={run.lat} lon={run.lon} speed={run.speed} size="thumb" />}
        </div>
      </div>
    </Card>
  );
}
