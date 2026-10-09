"use client";

import { Icon } from "@/components/ui/icon";
import { press } from "@/components/ui/press";
import { formatKm, formatPace } from "@/lib/format";

import { projectRoute } from "./geo";
import { Sparkline } from "./sparkline";

function RouteOutline({ name, lat, lon }: { name: string; lat: number[]; lon: number[] }) {
  const points = projectRoute(lat, lon, 88, 88, 10);
  if (points.length < 2) {
    return <p className="text-base text-ink">No route outline</p>;
  }
  const drawn = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return (
    <svg role="img" aria-label={`Route outline of ${name}`} width={88} height={88} viewBox="0 0 88 88" className="block">
      <rect width={88} height={88} rx={12} fill="var(--surface-1)" />
      <polyline fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={drawn} />
    </svg>
  );
}

export function LoopCard({
  loop,
}: {
  loop: {
    id: string;
    name: string;
    distanceM: number;
    attempts: number;
    bestPaceS: number;
    latestPaceS: number;
    trend: number[];
    sig: { lat: number[]; lon: number[] };
  };
}) {
  const attemptsLabel = `${loop.attempts} ${loop.attempts === 1 ? "attempt" : "attempts"}`;
  const summary = `${loop.name}, ${formatKm(loop.distanceM)} km loop, ${attemptsLabel}, best ${formatPace(loop.bestPaceS)} per km, latest ${formatPace(loop.latestPaceS)} per km`;
  return (
    <article aria-label={summary} className={`flex w-full max-w-full flex-col gap-2 rounded-card border border-line bg-surface-1 p-4 ${press}`}>
      <h2 className="font-body text-base font-semibold text-ink">{loop.name}</h2>
      <p className="font-mono text-[12px] text-ink-muted">{formatKm(loop.distanceM)} km loop</p>
      <p className="flex items-center gap-1.5 text-base text-ink">
        <Icon name="repeat" />
        {attemptsLabel}
      </p>
      <p className="text-base text-ink">
        Best <span className="num">{formatPace(loop.bestPaceS)}</span> per km
      </p>
      <p className="text-base text-ink">
        Latest <span className="num">{formatPace(loop.latestPaceS)}</span> per km
      </p>
      <RouteOutline name={loop.name} lat={loop.sig.lat} lon={loop.sig.lon} />
      <Sparkline values={loop.trend} label={`${loop.name} pace trend`} />
    </article>
  );
}
