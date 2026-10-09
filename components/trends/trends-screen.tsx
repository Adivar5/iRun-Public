"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BestEffortsBoard } from "@/components/charts/best-efforts-board";
import { ChartCard } from "@/components/charts/chart-card";
import { EfficiencyLine } from "@/components/charts/efficiency-line";
import { PaceDistanceCurve } from "@/components/charts/pace-distance-curve";
import { VolumeBars } from "@/components/charts/volume-bars";
import { ZoneStackBar } from "@/components/charts/zone-stack-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatPace } from "@/lib/format";
import type { TrendRange, TrendsView, VolumeTrend } from "@/lib/data/trends";

const RANGES: { value: TrendRange; label: string }[] = [
  { value: "4w", label: "4w" },
  { value: "12w", label: "12w" },
  { value: "6m", label: "6m" },
  { value: "all", label: "All" },
];

export function TrendsChrome({ range }: { range: TrendRange }) {
  const router = useRouter();
  return (
    <>
      <h1 className="font-display text-[20px] font-semibold text-ink">Trends</h1>
      <SegmentedControl
        label="Trend range"
        options={RANGES}
        value={range}
        onChange={(next) => {
          router.replace(next === "12w" ? "/trends" : `/trends?range=${next}`, { scroll: false });
        }}
      />
    </>
  );
}

export function TrendsVolumeCard({ view }: { view: VolumeTrend }) {
  return (
    <ChartCard
      question="Am I building volume?"
      answer={view.volumeAnswer}
      table={{
        title: "Weekly kilometres",
        columns: ["Week", "km"],
        rows: view.volumeWeeks.map((week) => [week.weekStart, week.km]),
      }}
    >
      <VolumeBars weeks={view.volumeWeeks} targetMinKm={view.targetMinKm} targetMaxKm={view.targetMaxKm} />
    </ChartCard>
  );
}

export function TrendsRest({ view }: { view: TrendsView }) {
  const [hideZoneNudge, setHideZoneNudge] = useState(false);
  return (
    <>
      <ChartCard
        question="Is easy running getting more efficient?"
        answer={view.efficiencyAnswer}
        table={{
          title: "Easy-run efficiency",
          columns: ["Date", "Efficiency"],
          rows: view.efficiency.map((point) => [point.date, point.value]),
        }}
      >
        <div className="min-h-[180px]">
          <EfficiencyLine points={view.efficiency} />
        </div>
      </ChartCard>
      <ChartCard
        question="Where are my best efforts?"
        answer={view.effortsAnswer}
        table={{
          title: "Best efforts",
          columns: ["Distance", "Exact", "Equivalent"],
          rows: view.efforts.map((row) => [row.label, row.exactS ?? "–", row.equivalentS ?? "–"]),
        }}
      >
        <BestEffortsBoard rows={view.efforts} />
      </ChartCard>
      <ChartCard
        question="How does pace change with distance?"
        answer={view.curveAnswer}
        table={{
          title: "Pace by distance",
          columns: ["Distance (km)", "Pace (min/km)"],
          rows: view.curve.map((point) => [(point.distanceM / 1000).toFixed(1), formatPace(point.paceS)]),
        }}
      >
        <div className="min-h-[180px]">
          <PaceDistanceCurve curve={view.curve} loops={view.curveLoops} />
        </div>
      </ChartCard>
      <ChartCard
        question="Where did this week's heart rate sit?"
        answer={view.zonesAnswer}
        table={{
          title: "This week's zones",
          columns: ["Zone", "Minutes"],
          rows: view.zoneSeconds ? view.zoneSeconds.map((seconds, index) => [`Z${index + 1}`, Math.round(seconds / 60)]) : [],
        }}
      >
        {view.maxHr == null && !hideZoneNudge ? (
          <p className="mb-3 flex flex-wrap items-center gap-3 text-base text-ink">
            <a href="/settings" className="text-accent-ink">
              Set max heart rate
            </a>
            <button type="button" className="min-h-11 text-ink-muted" onClick={() => setHideZoneNudge(true)}>
              Dismiss
            </button>
          </p>
        ) : null}
        {view.zoneSeconds ? <ZoneStackBar seconds={view.zoneSeconds} hasHeartRate showTable={false} /> : null}
      </ChartCard>
    </>
  );
}

export function TrendsScreen({ view }: { view: TrendsView }) {
  return (
    <div className="flex flex-col gap-4">
      <TrendsChrome range={view.range} />
      <TrendsVolumeCard view={view} />
      <TrendsRest view={view} />
    </div>
  );
}
