import type { Stream } from "./types.ts";

export const EFFORT_DISTANCES = [
  { label: "400m", m: 400 },
  { label: "1k", m: 1000 },
  { label: "1mi", m: 1609.344 },
  { label: "5k", m: 5000 },
  { label: "10k", m: 10000 },
  { label: "15k", m: 15000 },
  { label: "half", m: 21097.5 },
] as const;

// Two pointers over cumulative distance. The window start is interpolated so the window is exactly targetM.
export function bestEffort(s: Stream, targetM: number): { elapsedS: number; startOffsetS: number } | null {
  const { t, d } = s;
  if ((d.at(-1) ?? 0) < targetM) return null;
  let best: { elapsedS: number; startOffsetS: number } | null = null;
  let i = 0;
  for (let j = 1; j < d.length; j++) {
    while (i + 1 < j && d[j]! - d[i + 1]! >= targetM) i++;
    if (d[j]! - d[i]! < targetM) continue;
    const startD = d[j]! - targetM;
    const span = d[i + 1]! - d[i]!;
    const f = (startD - d[i]!) / (span || 1);
    const startT = t[i]! + f * (t[i + 1]! - t[i]!);
    const elapsedS = t[j]! - startT;
    if (!best || elapsedS < best.elapsedS) {
      best = { elapsedS: Math.round(elapsedS * 10) / 10, startOffsetS: Math.round(startT * 10) / 10 };
    }
  }
  return best;
}

export function riegel(t1S: number, d1M: number, d2M: number, exponent = 1.06): number {
  return t1S * Math.pow(d2M / d1M, exponent);
}

const EQUIVALENT = new Set(["5k", "10k", "half"]);

// Continuous runs only: at least 4 km, elapsed within 5% of moving, extrapolate at most 1.5x.
export function equivalentEfforts(
  w: { distanceM: number; elapsedS: number; movingS: number },
  exponent = 1.06,
): { label: string; elapsedS: number }[] {
  if (w.distanceM < 4000 || w.elapsedS > w.movingS * 1.05) return [];
  return EFFORT_DISTANCES.filter((x) => EQUIVALENT.has(x.label) && x.m <= w.distanceM * 1.5).map((x) => ({
    label: x.label,
    elapsedS: Math.round(riegel(w.movingS, w.distanceM, x.m, exponent)),
  }));
}

export function markPbs(
  existing: { label: string; elapsedS: number }[],
  fresh: { label: string; elapsedS: number }[],
): { label: string; isPb: boolean }[] {
  return fresh.map((effort) => {
    const prev = existing.find((row) => row.label === effort.label);
    return { label: effort.label, isPb: !prev || effort.elapsedS < prev.elapsedS };
  });
}
