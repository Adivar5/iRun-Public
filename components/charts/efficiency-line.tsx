"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";

import { CollectingState } from "./collecting-state";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function dayTick(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

export function EfficiencyLine({
  points,
  minRuns = 10,
}: {
  points: { date: string; value: number }[];
  minRuns?: number;
}) {
  const ready = points.length >= minRuns;
  if (!ready) {
    return <CollectingState have={points.length} need={minRuns} what="runs" />;
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!.value;
  const last = sorted[sorted.length - 1]!.value;
  const noun = sorted.length === 1 ? "easy run" : "easy runs";
  const summary = `Efficiency over ${sorted.length} ${noun}, from ${first.toFixed(2)} to ${last.toFixed(2)}, latest ${last.toFixed(2)}.`;
  const data = sorted.map((point) => ({ day: dayTick(point.date), value: point.value }));

  return (
    <div role="img" aria-label={summary} className="w-full max-w-full">
      <div aria-hidden="true" className="w-full overflow-hidden" style={{ minHeight: 180 }}>
        <LineChart width={300} height={180} data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} accessibilityLayer={false}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-mono-face), ui-monospace, monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-display)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Line
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </div>
      <p className="mt-2 font-mono text-[12px] text-ink">
        {first.toFixed(2)} to {last.toFixed(2)}, latest {last.toFixed(2)}
      </p>
    </div>
  );
}
