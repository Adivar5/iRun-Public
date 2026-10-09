"use client";

import { formatPace } from "@/lib/format";

import { useSessionFill } from "./use-session-fill";

const SIZE = 220;
const CX = 110;
const CY = 110;
const R = 78;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * (270 / 360);

const RING_CSS = `
@keyframes irun-goal-fill {
  from { stroke-dashoffset: var(--irun-ring-from); }
  to { stroke-dashoffset: var(--irun-ring-to); }
}
.irun-goal-fill { animation: irun-goal-fill 400ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .irun-goal-fill { animation: none; }
}
`;

function bestCaption(source: "exact" | "equivalent" | null, pace: string): string | null {
  switch (source) {
    case "exact":
      return `exact ${pace}`;
    case "equivalent":
      return `~${pace} est`;
    case null:
      return null;
    default: {
      const unexpected: never = source;
      return unexpected;
    }
  }
}

function paceFraction(goalPaceS: number, paceS: number): number {
  if (paceS <= goalPaceS) return 1;
  return Math.min(1, Math.max(0, goalPaceS / paceS));
}

function markerPoint(fraction: number): { x: number; y: number } {
  const theta = (fraction * 270 * Math.PI) / 180;
  return { x: CX + R * Math.cos(theta), y: CY + R * Math.sin(theta) };
}

export function GoalRing({
  goalPaceS,
  bestPaceS,
  source,
  reportedPaceS,
  effortName = "5k",
}: {
  goalPaceS: number;
  bestPaceS: number | null;
  source: "exact" | "equivalent" | null;
  reportedPaceS: number | null;
  effortName?: string;
}) {
  const play = useSessionFill(`goal-ring-${effortName}`, bestPaceS != null);
  if (bestPaceS == null || !Number.isFinite(bestPaceS)) {
    return <p className="text-base text-ink">No {effortName} effort yet</p>;
  }

  const gap = Math.round(bestPaceS - goalPaceS);
  const goalLabel = formatPace(goalPaceS);
  const behind = gap > 0;
  const ahead = gap < 0;
  const magnitude = Math.abs(gap);
  const center = behind ? `\u2212${magnitude}` : ahead ? `+${magnitude}` : "0";
  const summary = behind
    ? `${magnitude} seconds per km slower than the ${goalLabel} goal`
    : ahead
      ? `${magnitude} seconds per km faster than the ${goalLabel} goal`
      : `Even with the ${goalLabel} goal`;
  const caption = [
    bestCaption(source, formatPace(bestPaceS)),
    reportedPaceS != null && Number.isFinite(reportedPaceS) ? `reported ${formatPace(reportedPaceS)}` : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
  const progress = paceFraction(goalPaceS, bestPaceS);
  const offset = ARC * (1 - progress);
  const marker =
    reportedPaceS != null && Number.isFinite(reportedPaceS)
      ? markerPoint(paceFraction(goalPaceS, reportedPaceS))
      : null;

  return (
    <div role="img" aria-label={summary} className="flex w-full flex-col items-center gap-2">
      <style>{RING_CSS}</style>
      <div className="relative aspect-square w-full @container">
        <svg className="block h-full w-full" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <g transform={`rotate(135 ${CX} ${CY})`}>
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--border)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
              strokeDashoffset={offset}
              className={
                play
                  ? "irun-goal-fill [filter:drop-shadow(0_0_8px_rgb(214_242_92/0.35))] [[data-theme=light]_&]:filter-none"
                  : "[filter:drop-shadow(0_0_8px_rgb(214_242_92/0.35))] [[data-theme=light]_&]:filter-none"
              }
              style={{ ["--irun-ring-from" as string]: `${ARC}px`, ["--irun-ring-to" as string]: `${offset}px` }}
            />
            {marker ? (
              <circle data-marker="reported" cx={marker.x} cy={marker.y} r={5} fill="var(--text)" stroke="var(--surface-1)" strokeWidth={2} />
            ) : null}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[25cqw] italic leading-none text-ink">{center}</span>
          <span className="font-mono text-[6cqw] text-ink-muted">s/km</span>
        </div>
      </div>
      {caption ? <p className="text-center font-mono text-[12px] text-ink-muted">{caption}</p> : null}
    </div>
  );
}
