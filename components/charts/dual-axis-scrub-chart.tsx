"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { ChartTableSheet, chartButtonClass, chartEaseStyle, formatChartHeart, formatChartPace } from "./chart-table-sheet";
import { seriesIndices } from "./downsample";

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  const weight = rank - low;
  return sorted[low]! * (1 - weight) + sorted[high]! * weight;
}

export function validPace(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function validHeart(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function smoothPace(t: number[], paceSPerKm: (number | null)[]): (number | null)[] {
  const speeds = paceSPerKm.map((pace) => (validPace(pace) ? 1000 / pace : null));
  const smoothed: (number | null)[] = paceSPerKm.map(() => null);
  let left = 0;
  let right = 0;
  let sum = 0;
  let count = 0;
  for (let index = 0; index < paceSPerKm.length; index++) {
    if (speeds[index] == null) continue;
    const center = t[index] ?? 0;
    while (right < paceSPerKm.length && (t[right] ?? 0) <= center + 15) {
      const speed = speeds[right];
      if (speed != null) {
        sum += speed;
        count += 1;
      }
      right += 1;
    }
    while (left < paceSPerKm.length && (t[left] ?? 0) < center - 15) {
      const speed = speeds[left];
      if (speed != null) {
        sum -= speed;
        count -= 1;
      }
      left += 1;
    }
    if (count > 0) smoothed[index] = 1000 / (sum / count);
  }
  return smoothed;
}

function snapDomain(
  values: number[],
  step: number,
  spanMultiple: number,
  minSpan: number,
): { min: number; max: number } {
  const low = percentile(values, 0.05);
  const high = percentile(values, 0.95);
  let min = Math.floor(low / step) * step;
  let max = Math.ceil(high / step) * step;
  if (max === min) {
    min -= minSpan / 2;
    max += minSpan / 2;
  }
  for (let guard = 0; guard < 80 && (max - min < minSpan || (max - min) % spanMultiple !== 0); guard++) {
    const roomBelow = low - min;
    const roomAbove = max - high;
    if (roomBelow <= roomAbove) min -= step;
    else max += step;
  }
  return { min, max };
}

export function paceDomain(values: number[]): { min: number; max: number } {
  return snapDomain(values, 15, 30, 60);
}

export function heartDomain(values: number[]): { min: number; max: number } {
  return snapDomain(values, 10, 20, 20);
}

export function chartStride(count: number): number {
  return Math.max(1, Math.round(count / 100));
}

export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const clock = `${minutes}:${String(rest).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : clock;
}

export function durationPhrase(seconds: number): string {
  const safe = Math.max(0, seconds);
  if (safe < 60) return "less than a minute";
  const minutes = Math.round(safe / 60);
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}

export function keptSeriesIndices(
  t: number[],
  values: (number | null)[],
  valid: (value: number | null) => boolean,
  target = 500,
): number[] {
  const runs: number[][] = [];
  let current: number[] = [];
  values.forEach((value, index) => {
    if (valid(value)) current.push(index);
    else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length > 0) runs.push(current);
  const pointCount = runs.reduce((sum, run) => sum + run.length, 0);
  if (pointCount === 0) return [];
  if (pointCount <= target) return runs.flat();
  const kept: number[] = [];
  for (const run of runs) {
    if (run.length === 1) {
      kept.push(run[0]!);
      continue;
    }
    const share = Math.max(2, Math.round((run.length / pointCount) * target));
    const xs = run.map((index) => t[index] ?? index);
    const ys = run.map((index) => values[index] as number);
    for (const offset of seriesIndices(xs, ys, Math.min(share, run.length))) kept.push(run[offset]!);
  }
  return [...new Set(kept)].sort((left, right) => left - right);
}

const MONO = "var(--font-mono-face), ui-monospace, monospace";
const PLOT_T = 52;
const PLOT_B = 188;
const VIEW_H = 220;
const PLOT_H = PLOT_B - PLOT_T;
const PLOT_L = 34;
const scrubStyle = `${chartEaseStyle}
[data-scrubbing] .irun-ease { transition: none; }`;

function diamond(cx: number, cy: number): string {
  return `${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`;
}

function holds(values: (number | null)[], index: number, valid: (value: number | null) => boolean): boolean {
  return index >= 0 && index < values.length && valid(values[index] ?? null);
}

function isLone(values: (number | null)[], index: number, valid: (value: number | null) => boolean): boolean {
  return holds(values, index, valid) && !holds(values, index - 1, valid) && !holds(values, index + 1, valid);
}

function strokePath(
  indices: number[],
  values: (number | null)[],
  valid: (value: number | null) => boolean,
  xOf: (sample: number) => number,
  yOf: (value: number) => number,
): string {
  let d = "";
  let previous = -1;
  for (const sample of indices) {
    const value = values[sample];
    if (!valid(value ?? null) || isLone(values, sample, valid)) continue;
    let gap = previous < 0;
    for (let cursor = previous + 1; cursor < sample; cursor++) {
      if (!holds(values, cursor, valid)) gap = true;
    }
    d += `${previous < 0 || gap ? "M" : "L"}${xOf(sample).toFixed(1)} ${yOf(value as number).toFixed(1)}`;
    previous = sample;
  }
  return d;
}

export function DualAxisScrubChart({
  t,
  paceSPerKm,
  hr,
  onScrub,
}: {
  t: number[];
  paceSPerKm: (number | null)[];
  hr: (number | null)[] | null;
  onScrub?(i: number | null): void;
}) {
  const count = t.length;
  const last = Math.max(0, count - 1);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [emphasis, setEmphasis] = useState<"pace" | "hr" | null>(null);
  const scrubbingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const hold = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  useEffect(
    () => () => {
      if (hold.current != null) window.clearTimeout(hold.current);
    },
    [],
  );

  function setScrub(next: boolean) {
    scrubbingRef.current = next;
    setScrubbing(next);
  }

  function commit(next: number) {
    const clamped = Math.max(0, Math.min(last, next));
    indexRef.current = clamped;
    setIndex(clamped);
    setEngaged(true);
    onScrub?.(clamped);
  }

  function step(direction: 1 | -1) {
    commit(indexRef.current + direction * chartStride(count));
  }

  function seek(clientX: number, rect: DOMRect) {
    if (count === 0 || rect.width === 0) return;
    commit(Math.round(((clientX - rect.left) / rect.width) * last));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    origin.current = { x: event.clientX, y: event.clientY };
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const clientX = event.clientX;
    hold.current = window.setTimeout(() => {
      setScrub(true);
      target.setPointerCapture?.(pointerId);
      seek(clientX, target.getBoundingClientRect());
    }, 150);
  }

  function endHold() {
    if (hold.current != null) window.clearTimeout(hold.current);
    hold.current = null;
    setScrub(false);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) {
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (hold.current != null && dx * dx + dy * dy > 64) endHold();
      return;
    }
    seek(event.clientX, event.currentTarget.getBoundingClientRect());
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      commit(0);
    } else if (event.key === "End") {
      event.preventDefault();
      commit(last);
    }
  }

  const smoothed = smoothPace(t, paceSPerKm);
  const paceValues = smoothed.filter(validPace);
  const heartValues = (hr ?? []).filter(validHeart);
  const hasPace = paceValues.length > 0;
  const hasHeart = hr != null && heartValues.length > 0;
  const paceScale = hasPace ? paceDomain(paceValues) : null;
  const heartScale = hasHeart ? heartDomain(heartValues) : null;
  const plotR = hasHeart ? 266 : 292;
  const xOf = (sample: number) => PLOT_L + (count <= 1 ? 0.5 : sample / last) * (plotR - PLOT_L);
  const yPace = (value: number) => {
    const min = paceScale?.min ?? 0;
    const max = paceScale?.max ?? 1;
    const span = max - min || 1;
    const clamped = Math.min(max, Math.max(min, value));
    return PLOT_T + ((clamped - min) / span) * PLOT_H;
  };
  const yHr = (value: number) => {
    const min = heartScale?.min ?? 0;
    const max = heartScale?.max ?? 1;
    const span = max - min || 1;
    const clamped = Math.min(max, Math.max(min, value));
    return PLOT_B - ((clamped - min) / span) * PLOT_H;
  };
  const paceKept = keptSeriesIndices(t, smoothed, validPace);
  const hrKept = hasHeart && hr ? keptSeriesIndices(t, hr, validHeart) : [];
  const paceD = strokePath(paceKept, smoothed, validPace, xOf, yPace);
  const hrD = hasHeart && hr ? strokePath(hrKept, hr, validHeart, xOf, yHr) : "";
  const paceLones = smoothed.flatMap((value, sample) => (isLone(smoothed, sample, validPace) ? [sample] : []));
  const hrLones = hr ? hr.flatMap((value, sample) => (isLone(hr, sample, validHeart) ? [sample] : [])) : [];
  const durationS = count > 0 ? (t[last] ?? 0) - (t[0] ?? 0) : 0;
  const invalidHr = hr ? hr.filter((value) => !validHeart(value)).length : 0;
  const missingRatio = hr && hr.length > 0 ? invalidHr / hr.length : 0;
  const missingS = missingRatio * durationS;
  const partial = hasHeart && missingRatio >= 0.5;
  const paceMin = hasPace ? Math.min(...paceValues) : 0;
  const paceMax = hasPace ? Math.max(...paceValues) : 0;
  const hrMin = hasHeart ? Math.min(...heartValues) : 0;
  const hrMax = hasHeart ? Math.max(...heartValues) : 0;
  const duration = durationPhrase(durationS);
  let summary = "No pace samples on this run.";
  if (hasPace && hasHeart) {
    summary = `Pace and heart rate over the run, ${duration}. Pace, solid line, ranges from ${formatChartPace(paceMin)} to ${formatChartPace(paceMax)} per kilometre. Heart rate, dashed line, ranges from ${Math.round(hrMin)} to ${Math.round(hrMax)} beats per minute.`;
    if (missingRatio >= 0.05) {
      const missing =
        missingS < 60
          ? "Heart rate is missing for less than a minute."
          : `Heart rate is missing for ${Math.round(missingS / 60)} of ${Math.max(1, Math.round(durationS / 60))} minutes.`;
      summary = `${summary} ${missing}`;
    }
  } else if (hasPace) {
    summary = `Pace over the run, ${duration}, ranges from ${formatChartPace(paceMin)} to ${formatChartPace(paceMax)} per kilometre. No heart rate on this run.`;
  } else if (hasHeart) {
    summary = `Heart rate over the run, ${duration}. Heart rate, dashed line, ranges from ${Math.round(hrMin)} to ${Math.round(hrMax)} beats per minute. No pace on this run.`;
  }
  const paceNow = engaged && validPace(smoothed[index] ?? null) ? smoothed[index]! : null;
  const hrNow = engaged && hasHeart && validHeart(hr?.[index] ?? null) ? hr![index]! : null;
  const showPaceMissing = engaged && paceNow == null;
  const showHrMissing = engaged && hasHeart && hrNow == null;
  const paceTicks = paceScale ? [paceScale.min, (paceScale.min + paceScale.max) / 2, paceScale.max] : [];
  const hrTicks = heartScale ? [heartScale.max, (heartScale.min + heartScale.max) / 2, heartScale.min] : [];
  const tickY = [PLOT_T, (PLOT_T + PLOT_B) / 2, PLOT_B];
  const tableIndex = [...new Set([...paceKept, ...hrKept])].sort((left, right) => left - right);
  const columns = hasHeart
    ? ["Time (m:ss)", "Pace (min/km, 30 s avg)", "Heart rate (bpm)"]
    : ["Time (m:ss)", "Pace (min/km, 30 s avg)"];
  const hrHead = hasHeart ? (partial ? "Heart rate, partial" : "Heart rate") : "No heart rate on this run";
  const bothSeries = hasPace && hasHeart;
  const paceWidth = bothSeries && emphasis === "pace" ? 3.5 : bothSeries && emphasis === "hr" ? 1.25 : 2;
  const hrWidth = bothSeries && emphasis === "hr" ? 3.5 : bothSeries && emphasis === "pace" ? 1.25 : 2;
  const pacePath = paceD ? (
    <path data-series="pace" d={paceD} fill="none" stroke="var(--accent)" strokeWidth={paceWidth} strokeLinejoin="round" />
  ) : null;
  const hrPath = hrD ? (
    <path data-series="hr" d={hrD} fill="none" stroke="var(--text)" strokeWidth={hrWidth} strokeDasharray="6 4" strokeLinecap="butt" />
  ) : null;
  const midY = (PLOT_T + PLOT_B) / 2;

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <p data-scrub-readout="" className={engaged ? "flex flex-wrap gap-x-4 gap-y-1 text-base text-ink" : "text-[13px] text-ink-muted"}>
        {engaged ? (
          <>
            {showPaceMissing ? (
              <span>No pace</span>
            ) : (
              <span>
                <svg aria-hidden="true" width="14" height="8" viewBox="0 0 14 8" className="mr-1 inline-block align-middle">
                  <line x1="0" y1="4" x2="14" y2="4" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span>Pace </span>
                <span className="num">{formatChartPace(paceNow)}</span>
                <span className="text-ink-muted"> /km</span>
              </span>
            )}
            {hasHeart ? (
              showHrMissing ? (
                <span>No heart rate</span>
              ) : (
                <span>
                  <svg aria-hidden="true" width="14" height="8" viewBox="0 0 14 8" className="mr-1 inline-block align-middle">
                    <line x1="0" y1="4" x2="14" y2="4" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="butt" />
                  </svg>
                  <span>Heart rate </span>
                  <span className="num">{Math.round(hrNow ?? 0)}</span>
                  <span className="text-ink-muted"> bpm</span>
                </span>
              )
            ) : null}
          </>
        ) : (
          "Hold and drag to scrub"
        )}
      </p>
      <div
        role="group"
        tabIndex={0}
        aria-label="Scrub the run with the arrow keys"
        className="relative w-full"
        data-scrubbing={scrubbing ? "true" : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endHold}
        onPointerCancel={endHold}
      >
        <svg role="img" aria-label={summary} viewBox={`0 0 300 ${VIEW_H}`} className="block h-auto w-full touch-pan-y">
          <style>{scrubStyle}</style>
          <rect width="300" height={VIEW_H} fill="var(--surface-1)" rx="12" />
          {[PLOT_T, midY, PLOT_B].map((y) => (
            <line key={y} x1={PLOT_L} x2={plotR} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
          ))}
          {bothSeries ? null : (
            <>
              {hasPace ? <line x1="2" y1="9" x2="16" y2="9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /> : null}
              <text x="20" y="14" fill="var(--text)" fontSize="12" fontFamily={MONO}>
                {hasPace ? "Pace" : "No pace on this run"}
              </text>
              {hasHeart ? <line x1="278" y1="9" x2="292" y2="9" stroke="var(--text)" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="butt" /> : null}
              <text x={hasHeart ? 274 : 292} y="14" textAnchor="end" fill={hasHeart ? "var(--text)" : "var(--text-muted)"} fontSize="12" fontFamily={MONO}>
                {hrHead}
              </text>
            </>
          )}
          {paceTicks.map((value, tick) => (
            <text key={`pace-${tick}`} data-tick="pace" x="2" y={tickY[tick]} fill="var(--text-muted)" fontSize="12" fontFamily={MONO}>
              {formatChartPace(value)}
            </text>
          ))}
          {hrTicks.map((value, tick) => (
            <text key={`hr-${tick}`} data-tick="hr" x="296" y={tickY[tick]} textAnchor="end" fill="var(--text-muted)" fontSize="12" fontFamily={MONO}>
              {Math.round(value)}
            </text>
          ))}
          {count > 0
            ? [0, Math.round(last / 2), last].map((sample, tick) => (
                <text
                  key={`time-${tick}`}
                  data-tick="time"
                  x={tick === 0 ? PLOT_L : tick === 1 ? xOf(sample) : plotR}
                  y="208"
                  textAnchor={tick === 0 ? "start" : tick === 1 ? "middle" : "end"}
                  fill="var(--text-muted)"
                  fontSize="12"
                  fontFamily={MONO}
                >
                  {formatElapsed(t[sample] ?? 0)}
                </text>
              ))
            : null}
          {emphasis === "pace" ? hrPath : pacePath}
          {emphasis === "pace" ? pacePath : hrPath}
          {paceLones.map((sample) => (
            <circle key={`pace-dot-${sample}`} cx={xOf(sample)} cy={yPace(smoothed[sample]!)} r="2" fill="var(--accent)" />
          ))}
          {hrLones.map((sample) => (
            <circle key={`hr-dot-${sample}`} cx={xOf(sample)} cy={yHr(hr![sample]!)} r="2" fill="var(--text)" />
          ))}
          {engaged ? (
            <g data-scrub-cursor="" className="irun-ease" style={{ transformBox: "view-box", transformOrigin: "0 0", transform: `translate(${xOf(index)}px, 0px)` }}>
              <line x1="0" x2="0" y1={PLOT_T} y2={PLOT_B} stroke="var(--text)" strokeWidth="1" />
              {paceNow != null ? <circle cy={yPace(paceNow)} r="4" fill="var(--accent)" stroke="var(--surface-1)" strokeWidth="2" /> : null}
              {hrNow != null ? <polygon points={diamond(0, yHr(hrNow))} fill="var(--text)" stroke="var(--surface-1)" strokeWidth="2" /> : null}
            </g>
          ) : null}
        </svg>
      </div>
      {bothSeries ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={chartButtonClass}
            aria-pressed={emphasis === "pace"}
            aria-label="Emphasize pace"
            onClick={() => setEmphasis((current) => (current === "pace" ? null : "pace"))}
          >
            Pace
          </button>
          <button
            type="button"
            className={chartButtonClass}
            aria-pressed={emphasis === "hr"}
            aria-label="Emphasize heart rate"
            onClick={() => setEmphasis((current) => (current === "hr" ? null : "hr"))}
          >
            {partial ? "Heart rate, partial" : "Heart rate"}
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className={chartButtonClass} onClick={() => step(-1)}>
          Previous point
        </button>
        <button type="button" className={chartButtonClass} onClick={() => step(1)}>
          Next point
        </button>
      </div>
      <ChartTableSheet
        title="Pace and heart rate"
        columns={columns}
        rows={tableIndex.map((sample) => {
          const row: (string | number)[] = [formatElapsed(t[sample] ?? 0), formatChartPace(validPace(smoothed[sample] ?? null) ? smoothed[sample]! : null)];
          if (hasHeart && hr) row.push(formatChartHeart(validHeart(hr[sample] ?? null) ? hr[sample]! : null));
          return row;
        })}
      />
    </div>
  );
}
