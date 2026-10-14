// 21st.dev Workout Summary Card (id 8257). Distance leads, route sits to the right. No like, delete, or rainbow chips.
import type { ReactNode } from "react";
import Link from "next/link";

import { RouteCanvas } from "@/components/charts/route-canvas";
import { Card } from "@/components/ui/card";
import { DeltaChip } from "@/components/ui/delta-chip";
import { PbChip } from "@/components/ui/pb-chip";
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

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-label text-ink-muted">{label}</dt>
      <dd className="text-ink">
        <span className="num text-stat">{value}</span>
        <span className="ml-1 font-mono text-label text-ink-muted">{unit}</span>
      </dd>
    </div>
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
      <div className="pointer-events-none relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
              <span className="rounded-full bg-accent-2 px-2.5 py-0.5 text-label font-semibold text-on-accent-2">
                Latest run
              </span>
              {kind ? <span className="text-ink-muted">{kind}</span> : null}
            </p>
            {freshPb ? (
              <div className="mt-2">
                <PbChip />
              </div>
            ) : (
              badge
            )}
            <div className="mt-2 min-w-0">
              <HeroStat value={formatKm(run.distanceM)} unit="km" label="Distance" />
            </div>
          </div>
          <div className="w-22 shrink-0 [&_button]:hidden">
            {route ?? <RouteCanvas lat={run.lat} lon={run.lon} speed={run.speed} size="thumb" />}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Metric label="Pace" value={formatPace(run.paceSPerKm)} unit="/km" />
          {run.avgHr == null ? (
            <div className="min-w-0">
              <dt className="font-mono text-label text-ink-muted">Heart rate</dt>
              <dd className="text-body text-ink">No heart rate</dd>
            </div>
          ) : (
            <Metric label="Heart rate" value={String(Math.round(run.avgHr))} unit="bpm" />
          )}
        </dl>
        {run.deltaVsSimilarSPerKm == null ? null : (
          <p className="flex flex-wrap items-center gap-2">
            <PaceDelta delta={run.deltaVsSimilarSPerKm} />
            <span className="text-label text-ink-muted">vs last similar run</span>
          </p>
        )}
      </div>
    </Card>
  );
}
