"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { DualAxisScrubChart } from "@/components/charts/dual-axis-scrub-chart";
import { ElevationProfile } from "@/components/charts/elevation-profile";
import { RouteCanvas } from "@/components/charts/route-canvas";
import { SplitBars } from "@/components/charts/split-bars";
import { ZoneStackBar } from "@/components/charts/zone-stack-bar";
import { Card } from "@/components/ui/card";
import { DeltaChip } from "@/components/ui/delta-chip";
import { press } from "@/components/ui/press";
import { cn } from "@/lib/cn";
import type { RunDetail } from "@/lib/data/runs";
import { formatDuration, formatKm, formatLocalDay, formatPace } from "@/lib/format";
import type { RunKind } from "@/supabase/functions/_shared/metrics/index.ts";

const KIND_LABEL = {
  easy: "Easy",
  tempo: "Tempo",
  long: "Long",
  intervals: "Intervals",
  other: "Other",
} as const satisfies Record<RunKind, string>;

function paceSeries(samples: NonNullable<RunDetail["samples"]>): (number | null)[] {
  return samples.t.map((_, index) => {
    const speed = samples.v?.[index];
    if (speed != null && Number.isFinite(speed) && speed > 0.3) return 1000 / speed;
    if (index === 0) return null;
    const dt = samples.t[index]! - samples.t[index - 1]!;
    const dd = (samples.d[index] ?? 0) - (samples.d[index - 1] ?? 0);
    if (dt <= 0 || dd <= 0) return null;
    return dt / (dd / 1000);
  });
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="text-ink">
        {value === "No heart rate" || value === "No pace" ? (
          <span className="text-[13px] leading-tight">{value}</span>
        ) : (
          <>
            <span className="num text-base">{value}</span>
            {unit ? <span className="text-[12px] text-ink-muted"> {unit}</span> : null}
          </>
        )}
      </dd>
    </div>
  );
}

export function RunDetailClient({ run }: { run: RunDetail }) {
  const [index, setIndex] = useState<number | null>(null);
  const paces = useMemo(() => (run.samples ? paceSeries(run.samples) : []), [run.samples]);
  const point = index != null && run.samples ? index : null;
  const kind = run.runKind ? KIND_LABEL[run.runKind] : null;

  const distance = point == null ? formatKm(run.distanceM) : formatKm(run.samples?.d[point] ?? 0);
  const time = point == null ? formatDuration(run.durationS) : formatDuration(Math.max(0, Math.round(run.samples?.t[point] ?? 0)));
  const paceValue = (() => {
    if (point == null) return formatPace(run.paceSPerKm);
    const pace = paces[point];
    if (pace == null || !Number.isFinite(pace)) return "No pace";
    return formatPace(pace);
  })();
  const heart = (() => {
    if (run.avgHr == null) return "No heart rate";
    if (point == null) return String(Math.round(run.avgHr));
    const bpm = run.samples?.hr?.[point];
    if (bpm == null || !Number.isFinite(bpm) || bpm <= 0) return "No heart rate";
    return String(Math.round(bpm));
  })();

  const delta = run.deltaVsSimilarSPerKm;

  return (
    <div className="flex flex-col gap-3">
      <header className="pb-3">
        <Link href="/runs" className={cn("inline-flex min-h-11 items-center text-base text-accent-ink", press)}>
          All runs
        </Link>
        <h1 className="text-base font-medium text-ink">
          {formatLocalDay(run.startAt)}
          {kind ? <span className="text-ink-muted"> · {kind}</span> : null}
        </h1>
        {point == null ? null : <p className="text-[13px] text-ink-muted">This point on the run</p>}
        <dl aria-live="polite" className="mt-1 grid grid-cols-4 gap-2">
          <Stat label="Distance" value={distance} unit="km" />
          <Stat label="Time" value={time} />
          <Stat label="Pace" value={paceValue} unit={paceValue === "No pace" ? undefined : "/km"} />
          <Stat label="Heart rate" value={heart} unit={heart === "No heart rate" ? undefined : "bpm"} />
        </dl>
      </header>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Route</h2>
        <RouteCanvas
          lat={run.samples?.lat ?? null}
          lon={run.samples?.lon ?? null}
          speed={run.samples?.v ?? null}
          size="detail"
          activeIndex={point}
        />
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Pace and heart rate</h2>
        {run.samples ? (
          <DualAxisScrubChart t={run.samples.t} paceSPerKm={paces} hr={run.samples.hr} onScrub={setIndex} />
        ) : (
          <p className="text-base text-ink">No pace samples on this run</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Splits</h2>
        <SplitBars splits={run.splits} />
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Zones</h2>
        <ZoneStackBar seconds={run.zoneSeconds} hasHeartRate={run.avgHr != null} />
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Elevation</h2>
        <ElevationProfile d={run.samples?.d ?? []} alt={run.samples?.alt ?? null} />
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-medium text-ink">Vs last similar run</h2>
        {delta == null ? (
          <p className="text-base text-ink">No similar run to compare.</p>
        ) : (
          <PaceCompare delta={delta} />
        )}
      </Card>
    </div>
  );
}

function PaceCompare({ delta }: { delta: number }) {
  const rounded = Math.round(delta);
  const direction = rounded < 0 ? "down" : rounded > 0 ? "up" : "flat";
  return (
    <p className="flex flex-wrap items-center gap-2">
      <DeltaChip
        direction={direction}
        good={rounded === 0 ? null : rounded < 0}
        value={formatPace(Math.abs(rounded))}
        unit="/km"
      />
      <span className="text-[13px] text-ink-muted">vs last similar run</span>
    </p>
  );
}
