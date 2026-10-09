"use client";

import { Bar, ComposedChart, LabelList, Line, ReferenceArea, XAxis, YAxis } from "recharts";

import { useSessionFill } from "./use-session-fill";

const BAR_CSS = `
@keyframes irun-bar-fill { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.irun-volume-fill .recharts-bar-rectangle {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: irun-bar-fill 400ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .irun-volume-fill .recharts-bar-rectangle { animation: none; }
}
`;

export function rollingAverage(values: number[], window: number): (number | null)[] {
  if (window <= 0) return values.map(() => null);
  return values.map((_, index) => {
    if (index + 1 < window) return null;
    const slice = values.slice(index + 1 - window, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / window;
  });
}

function formatKmAmount(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function weekTick(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

export function VolumeBars({
  weeks,
  targetMinKm,
  targetMaxKm,
}: {
  weeks: { weekStart: string; km: number }[];
  targetMinKm: number;
  targetMaxKm: number;
}) {
  const play = useSessionFill("volume-bars", weeks.length > 0);
  if (weeks.length === 0) {
    return (
      <p role="img" aria-label="No weekly volume yet" className="text-base text-ink">
        No weekly volume yet
      </p>
    );
  }

  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const averages = rollingAverage(
    sorted.map((week) => week.km),
    4,
  );
  const data = sorted.map((week, index) => ({
    week: weekTick(week.weekStart),
    km: week.km,
    avg: averages[index],
  }));
  const latest = sorted[sorted.length - 1]!.km;
  const average = averages[averages.length - 1];
  const weekNoun = sorted.length === 1 ? "week" : "weeks";
  const averageText = average == null ? "not ready" : `${formatKmAmount(average)} km`;
  const summary = `Weekly kilometres over ${sorted.length} ${weekNoun}. Latest week ${formatKmAmount(latest)} km, 4-week average ${averageText}, target ${formatKmAmount(targetMinKm)} to ${formatKmAmount(targetMaxKm)} km.`;
  const ceiling = Math.max(targetMaxKm, ...sorted.map((week) => week.km), 1);

  return (
    <div role="img" aria-label={summary} className="w-full max-w-full">
      <style>{BAR_CSS}</style>
      <div
        aria-hidden="true"
        className={play ? "irun-volume-fill w-full overflow-hidden" : "w-full overflow-hidden"}
        style={{ minHeight: 180 }}
      >
        <ComposedChart
          width={300}
          height={180}
          data={data}
          margin={{ top: 18, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer={false}
        >
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-mono-face), ui-monospace, monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(ceiling * 1.1)]}
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-display)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ReferenceArea y1={targetMinKm} y2={targetMaxKm} fill="var(--accent)" fillOpacity={0.18} ifOverflow="extendDomain" />
          <Bar dataKey="km" fill="var(--accent)" radius={[8, 8, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            <LabelList
              dataKey="km"
              position="top"
              formatter={(label) => (typeof label === "number" ? formatKmAmount(label) : "")}
              fill="var(--text)"
              fontSize={12}
              fontFamily="var(--font-display)"
            />
          </Bar>
          <Line
            dataKey="avg"
            stroke="var(--text)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--text)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-ink">
        <span>Bars, weekly km</span>
        <span>Line, 4-week average {averageText}</span>
        <span>
          Band, target {formatKmAmount(targetMinKm)} to {formatKmAmount(targetMaxKm)} km
        </span>
      </p>
    </div>
  );
}
