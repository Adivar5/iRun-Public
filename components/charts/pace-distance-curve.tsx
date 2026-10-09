"use client";

import { ComposedChart, Line, Scatter, XAxis, YAxis } from "recharts";

import { formatPace } from "@/lib/format";

function distanceLabel(distanceM: number): string {
  const km = distanceM / 1000;
  const text = Number.isInteger(km) ? String(km) : String(Math.round(km * 100) / 100);
  return `${text} km`;
}

export function PaceDistanceCurve({
  curve,
  loops,
}: {
  curve: { distanceM: number; paceS: number }[];
  loops: { distanceM: number; paceS: number; name: string }[];
}) {
  if (curve.length === 0) {
    return (
      <p role="img" aria-label="No pace curve yet" className="text-base text-ink">
        No pace curve yet
      </p>
    );
  }

  const sorted = [...curve].sort((a, b) => a.distanceM - b.distanceM);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const loopPhrase = loops.length === 1 ? "1 loop marked" : `${loops.length} loops marked`;
  const summary = `Best pace by distance, ${formatPace(first.paceS)} per km at ${distanceLabel(first.distanceM)} to ${formatPace(last.paceS)} per km at ${distanceLabel(last.distanceM)}, with ${loopPhrase}.`;
  const line = sorted.map((point) => ({ km: point.distanceM / 1000, pace: point.paceS }));
  const dots = loops.map((loop) => ({ km: loop.distanceM / 1000, pace: loop.paceS, name: loop.name }));
  const kms = [...line.map((point) => point.km), ...dots.map((point) => point.km)];
  const paces = [...line.map((point) => point.pace), ...dots.map((point) => point.pace)];
  const minKm = Math.min(...kms);
  const maxKm = Math.max(...kms);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);

  return (
    <div role="img" aria-label={summary} className="w-full max-w-full">
      <div aria-hidden="true" className="w-full overflow-hidden" style={{ minHeight: 180 }}>
        <ComposedChart
          width={300}
          height={180}
          data={line}
          margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
          accessibilityLayer={false}
        >
          <XAxis
            dataKey="km"
            type="number"
            domain={[minKm, maxKm]}
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-display)" }}
            tickFormatter={(value) => {
              const km = Number(value);
              return Number.isInteger(km) ? String(km) : km.toFixed(1);
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="pace"
            type="number"
            domain={[Math.max(0, minPace - 15), maxPace + 15]}
            reversed
            tick={{ fontSize: 12, fill: "var(--text-muted)", fontFamily: "var(--font-display)" }}
            tickFormatter={(value) => formatPace(Number(value))}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Line
            dataKey="pace"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
          {dots.length > 0 ? <Scatter data={dots} dataKey="pace" fill="var(--text)" /> : null}
        </ComposedChart>
      </div>
      <p className="mt-2 font-mono text-[12px] text-ink">
        {formatPace(first.paceS)} /km at {distanceLabel(first.distanceM)} to {formatPace(last.paceS)} /km at{" "}
        {distanceLabel(last.distanceM)}
      </p>
      {loops.length > 0 ? (
        <ul className="mt-1 font-mono text-[12px] text-ink">
          {loops.map((loop) => (
            <li key={loop.name}>
              {loop.name}, {formatPace(loop.paceS)} /km at {distanceLabel(loop.distanceM)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
