import { weekStartLocal } from "./time.ts";
import type { WeeklySummary, WorkoutLite, ZoneSeconds } from "./types.ts";

export function weeklySummaries(ws: WorkoutLite[]): WeeklySummary[] {
  const by = new Map<string, WorkoutLite[]>();
  for (const w of ws) {
    const k = weekStartLocal(w.startAt);
    by.set(k, [...(by.get(k) ?? []), w]);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, list]) => {
    const runs = list.filter((w) => w.type === "run");
    const loads = list.map((w) => w.load).filter((x): x is number => x != null);
    const effs = runs.map((w) => w.efficiency).filter((x): x is number => x != null);
    const zones = list.reduce<ZoneSeconds>(
      (z, w) => (w.zoneSeconds ? (z.map((v, i) => v + w.zoneSeconds![i]!) as ZoneSeconds) : z),
      [0, 0, 0, 0, 0],
    );
    return {
      weekStart,
      km: Math.round(runs.reduce((a, w) => a + w.distanceM, 0) / 100) / 10,
      runCount: runs.length,
      durationS: list.reduce((a, w) => a + w.durationS, 0),
      load: loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) * 10) / 10 : null,
      longRunKm: Math.round(Math.max(0, ...runs.map((w) => w.distanceM)) / 100) / 10,
      avgEfficiency: effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : null,
      zoneSeconds: zones,
    };
  });
}
