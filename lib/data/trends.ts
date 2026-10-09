import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  DEFAULT_ZONE_BOUNDS,
  localDate,
  weekStartLocal,
  zoneSeconds as zonesFromStream,
  type Stream,
  type ZoneSeconds,
} from "@/supabase/functions/_shared/metrics/index.ts";

export type WeekVolume = { weekStart: string; km: number };

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Oldest week first. Runs outside the window are dropped. */
export function weeklyVolume(
  runs: { startAt: string; distanceM: number }[],
  now: Date,
  weeks = 8,
): WeekVolume[] {
  const thisStart = weekStartLocal(now.toISOString());
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    weekStart: addUtcDays(thisStart, -7 * (weeks - 1 - index)),
    km: 0,
  }));
  const indexByStart = new Map(buckets.map((bucket, index) => [bucket.weekStart, index]));
  for (const run of runs) {
    const index = indexByStart.get(weekStartLocal(run.startAt));
    if (index == null) continue;
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.km = Math.round((bucket.km + run.distanceM / 1000) * 100) / 100;
  }
  return buckets;
}

export async function getWeeklyVolume(sb: SupabaseClient<Database>, now = new Date(), weeks = 8): Promise<WeekVolume[]> {
  const start = weekStartLocal(now.toISOString());
  const from = new Date(`${addUtcDays(start, -7 * (weeks - 1))}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() - 2);
  const { data, error } = await sb
    .from("workouts")
    .select("start_at, distance_m")
    .eq("type", "run")
    .gte("start_at", from.toISOString())
    .lte("start_at", new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString());
  if (error) throw new Error("Could not load weekly volume");
  return weeklyVolume(
    (data ?? []).map((row) => ({ startAt: row.start_at, distanceM: row.distance_m })),
    now,
    weeks,
  );
}

export type TrendRange = "4w" | "12w" | "6m" | "all";

const RANGES = ["4w", "12w", "6m", "all"] as const satisfies readonly TrendRange[];

export function parseTrendRange(value: string | undefined): TrendRange {
  for (const range of RANGES) {
    if (range === value) return range;
  }
  return "12w";
}

export function rollingAverage(values: number[], window = 4): (number | null)[] {
  if (window <= 0) return values.map(() => null);
  return values.map((_, index) => {
    if (index + 1 < window) return null;
    const slice = values.slice(index + 1 - window, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / window;
  });
}

function weeksForRange(range: TrendRange): number | null {
  switch (range) {
    case "4w":
      return 4;
    case "12w":
      return 12;
    case "6m":
      return 26;
    case "all":
      return null;
    default: {
      const unexpected: never = range;
      return unexpected;
    }
  }
}

function rangeStart(range: TrendRange, now: Date): string | null {
  const weeks = weeksForRange(range);
  if (weeks == null) return null;
  const start = weekStartLocal(now.toISOString());
  return `${addUtcDays(start, -7 * (weeks - 1))}T00:00:00.000Z`;
}

type Activity = {
  id: string;
  start_at: string;
  distance_m: number;
  type: string;
  run_kind: string | null;
  efficiency: number | null;
  is_leg_day: boolean;
  zone_seconds: number[] | null;
  has_hr: boolean;
};

export type TrendsView = {
  range: TrendRange;
  targetMinKm: number;
  targetMaxKm: number;
  maxHr: number | null;
  volumeWeeks: WeekVolume[];
  volumeAnswer: string;
  efficiency: { date: string; value: number }[];
  efficiencyAnswer: string;
  efforts: { label: string; exactS: number | null; equivalentS: number | null; deltaS: number | null; isPb: boolean }[];
  effortsAnswer: string;
  curve: { distanceM: number; paceS: number }[];
  curveLoops: { distanceM: number; paceS: number; name: string }[];
  curveAnswer: string;
  zoneSeconds: [number, number, number, number, number] | null;
  zonesHaveHr: boolean;
  zonesAnswer: string;
  days: { date: string; runKm: number; strength: boolean; legDay: boolean }[];
  daysSinceLegDay: number | null;
  calendarAnswer: string;
};

function kmText(km: number): string {
  return (Math.round(km * 10) / 10).toFixed(1);
}

function weekCount(range: TrendRange, earliest: string | null, now: Date): number {
  const fixed = weeksForRange(range);
  if (fixed != null) return fixed;
  if (!earliest) return 8;
  const start = Date.parse(`${weekStartLocal(earliest)}T00:00:00.000Z`);
  const end = Date.parse(`${weekStartLocal(now.toISOString())}T00:00:00.000Z`);
  const weeks = Math.floor((end - start) / (7 * 86_400_000)) + 1;
  return Math.min(52, Math.max(1, weeks));
}

function buildDays(rows: Activity[], fromDate: string, toDate: string) {
  const days: { date: string; runKm: number; strength: boolean; legDay: boolean }[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    days.push({ date: cursor, runKm: 0, strength: false, legDay: false });
    cursor = addUtcDays(cursor, 1);
  }
  const index = new Map(days.map((day, i) => [day.date, i]));
  for (const row of rows) {
    const day = days[index.get(localDate(row.start_at)) ?? -1];
    if (!day) continue;
    if (row.type === "run") day.runKm = Math.round((day.runKm + row.distance_m / 1000) * 10) / 10;
    if (row.type === "strength") day.strength = true;
    if (row.is_leg_day) day.legDay = true;
  }
  return days;
}

export type VolumeTrend = {
  range: TrendRange;
  targetMinKm: number;
  targetMaxKm: number;
  volumeWeeks: WeekVolume[];
  volumeAnswer: string;
};

/** Kilometres and the weekly target only, so the first Trends card can paint before efforts and zones. */
export async function getVolumeTrend(sb: SupabaseClient<Database>, range: TrendRange, now = new Date()): Promise<VolumeTrend> {
  const from = rangeStart(range, now);
  let activityQuery = sb
    .from("workouts")
    .select("start_at, distance_m")
    .eq("type", "run")
    .order("start_at", { ascending: true })
    .limit(2000);
  if (from) activityQuery = activityQuery.gte("start_at", from);
  const [activity, profile] = await Promise.all([
    activityQuery,
    sb.from("profiles").select("weekly_km_target_min, weekly_km_target_max").maybeSingle(),
  ]);
  if (activity.error) throw new Error("Could not load training");
  if (profile.error) throw new Error("Could not load the weekly target");
  const runs = activity.data ?? [];
  const earliest = runs[0]?.start_at ?? null;
  const count = weekCount(range, earliest, now);
  const volumeWeeks = weeklyVolume(
    runs.map((row) => ({ startAt: row.start_at, distanceM: row.distance_m })),
    now,
    count,
  );
  const targetMinKm = profile.data?.weekly_km_target_min ?? 30;
  const targetMaxKm = profile.data?.weekly_km_target_max ?? 40;
  const latestKm = volumeWeeks.at(-1)?.km ?? 0;
  const volumeAnswer =
    latestKm === 0
      ? `Week of ${volumeWeeks.at(-1)?.weekStart ?? ""}, 0 of ${targetMinKm} to ${targetMaxKm} km`
      : `${kmText(latestKm)} km this week, target ${targetMinKm} to ${targetMaxKm} km`;
  return { range, targetMinKm, targetMaxKm, volumeWeeks, volumeAnswer };
}

export async function getTrends(sb: SupabaseClient<Database>, range: TrendRange, now = new Date()): Promise<TrendsView> {
  const from = rangeStart(range, now);
  let activityQuery = sb
    .from("workouts")
    .select("id, start_at, distance_m, type, run_kind, efficiency, is_leg_day, zone_seconds, has_hr")
    .order("start_at", { ascending: true })
    .limit(2000);
  if (from) activityQuery = activityQuery.gte("start_at", from);
  const [activity, profile, efforts] = await Promise.all([
    activityQuery,
    sb.from("profiles").select("weekly_km_target_min, weekly_km_target_max, max_hr, zone_bounds").maybeSingle(),
    sb.from("best_efforts").select("distance_label, kind, distance_m, elapsed_s, is_pb"),
  ]);
  if (activity.error) throw new Error("Could not load training");
  if (profile.error) throw new Error("Could not load the weekly target");
  if (efforts.error) throw new Error("Could not load best efforts");

  const rows = (activity.data ?? []) as Activity[];
  const runs = rows.filter((row) => row.type === "run");
  const earliest = runs[0]?.start_at ?? null;
  const count = weekCount(range, earliest, now);
  const volumeWeeks = weeklyVolume(
    runs.map((row) => ({ startAt: row.start_at, distanceM: row.distance_m })),
    now,
    count,
  );
  const targetMinKm = profile.data?.weekly_km_target_min ?? 30;
  const targetMaxKm = profile.data?.weekly_km_target_max ?? 40;
  const latestKm = volumeWeeks.at(-1)?.km ?? 0;
  const volumeAnswer =
    latestKm === 0
      ? `Week of ${volumeWeeks.at(-1)?.weekStart ?? ""}, 0 of ${targetMinKm} to ${targetMaxKm} km`
      : `${kmText(latestKm)} km this week, target ${targetMinKm} to ${targetMaxKm} km`;

  const efficiency = runs
    .filter((row) => (row.run_kind === "easy" || row.run_kind === "long") && row.efficiency != null && row.efficiency > 0)
    .map((row) => ({ date: localDate(row.start_at), value: Math.round(row.efficiency! * 100) / 100 }));
  const efficiencyAnswer =
    efficiency.length < 10
      ? `Metres per heartbeat on easy and long runs. Higher means more ground at the same heart rate. ${efficiency.length} of about 10 runs so far, so the line waits.`
      : `Metres per heartbeat on easy and long runs. Latest ${efficiency.at(-1)?.value.toFixed(2)}. Higher means more ground at the same heart rate.`;

  const byLabel = new Map<string, TrendsView["efforts"][number] & { distanceM: number }>();
  for (const row of efforts.data ?? []) {
    const pace = row.distance_m > 0 ? row.elapsed_s / (row.distance_m / 1000) : null;
    if (pace == null) continue;
    let entry = byLabel.get(row.distance_label);
    if (!entry) {
      entry = { label: row.distance_label, exactS: null, equivalentS: null, deltaS: null, isPb: false, distanceM: row.distance_m };
      byLabel.set(row.distance_label, entry);
    }
    if (row.kind === "exact" && (entry.exactS == null || row.elapsed_s < entry.exactS)) {
      entry.exactS = row.elapsed_s;
      entry.isPb = row.is_pb;
      entry.distanceM = row.distance_m;
    }
    if (row.kind === "equivalent" && (entry.equivalentS == null || row.elapsed_s < entry.equivalentS)) {
      entry.equivalentS = row.elapsed_s;
    }
  }
  const effortRows = [...byLabel.values()]
    .filter((row) => row.label !== "whole")
    .sort((a, b) => a.distanceM - b.distanceM)
    .map(({ label, exactS, equivalentS, deltaS, isPb }) => ({ label, exactS, equivalentS, deltaS, isPb }));
  const five = effortRows.find((row) => row.label === "5k");
  const effortsAnswer = five?.exactS != null ? `Best exact 5k is the top mark` : "No exact 5k yet";

  const bestExact = new Map<string, { distanceM: number; paceS: number }>();
  for (const row of efforts.data ?? []) {
    if (row.kind !== "exact" || row.distance_m <= 0) continue;
    const paceS = row.elapsed_s / (row.distance_m / 1000);
    const current = bestExact.get(row.distance_label);
    if (!current || paceS < current.paceS) bestExact.set(row.distance_label, { distanceM: row.distance_m, paceS });
  }
  const curve = [...bestExact.values()].sort((a, b) => a.distanceM - b.distanceM);
  const curveAnswer =
    curve.length === 0
      ? "No pace curve yet"
      : "Each point is your best time at that distance. Faster sits lower. Dots are loops.";
  const { data: loopRows, error: loopError } = await sb.from("loops").select("id, name, typical_distance_m");
  if (loopError) throw new Error("Could not load loops");
  const { data: memberRows, error: memberError } = await sb.from("workout_loops").select("loop_id, workout_id");
  if (memberError) throw new Error("Could not load loop runs");
  const paceByWorkout = new Map<string, number>();
  if ((memberRows ?? []).length > 0) {
    const { data: paced, error: pacedError } = await sb
      .from("workouts")
      .select("id, distance_m, duration_s, moving_s")
      .in("id", (memberRows ?? []).map((row) => row.workout_id));
    if (pacedError) throw new Error("Could not load loop paces");
    for (const row of paced ?? []) {
      const seconds = row.moving_s != null && row.moving_s > 0 ? row.moving_s : row.duration_s;
      if (row.distance_m > 0) paceByWorkout.set(row.id, (seconds * 1000) / row.distance_m);
    }
  }
  const curveLoops = (loopRows ?? []).flatMap((loop) => {
    const paces = (memberRows ?? [])
      .filter((member) => member.loop_id === loop.id)
      .map((member) => paceByWorkout.get(member.workout_id))
      .filter((pace): pace is number => pace != null);
    const best = paces.length === 0 ? null : Math.min(...paces);
    if (best == null) return [];
    return [{ distanceM: loop.typical_distance_m, paceS: best, name: loop.name }];
  });

  const windowStart = volumeWeeks[0]?.weekStart ?? localDate(now.toISOString());
  const windowEnd = localDate(now.toISOString());
  const days = buildDays(rows, windowStart, windowEnd);
  const leg = [...rows].reverse().find((row) => row.is_leg_day);
  const daysSinceLegDay = leg == null ? null : Math.floor((now.getTime() - Date.parse(leg.start_at)) / 86_400_000);
  const runDays = days.filter((day) => day.runKm > 0).length;
  const calendarAnswer = `${runDays} days with a run in this range`;

  const latestWeek = volumeWeeks.at(-1)?.weekStart;
  const zones = [0, 0, 0, 0, 0];
  let zonesHaveHr = false;
  let anyZone = false;
  for (const row of runs) {
    if (latestWeek && weekStartLocal(row.start_at) !== latestWeek) continue;
    if (row.has_hr) zonesHaveHr = true;
    const seconds = row.zone_seconds;
    if (!seconds || seconds.length < 5) continue;
    anyZone = true;
    for (let i = 0; i < 5; i++) zones[i] = (zones[i] ?? 0) + (seconds[i] ?? 0);
  }
  let zoneSeconds: ZoneSeconds | null = anyZone ? (zones as ZoneSeconds) : null;
  const maxHr = profile.data?.max_hr ?? null;
  if (!zoneSeconds && zonesHaveHr && maxHr != null) {
    const ids = runs
      .filter((row) => latestWeek && weekStartLocal(row.start_at) === latestWeek && row.has_hr)
      .map((row) => row.id);
    if (ids.length > 0) {
      const { data: samples, error: sampleError } = await sb.from("workout_samples").select("t, d, hr").in("workout_id", ids);
      if (sampleError) throw new Error("Could not load heart-rate zones");
      const bounds = profile.data?.zone_bounds;
      const zoneBounds =
        bounds && bounds.length === 4
          ? ([Number(bounds[0]), Number(bounds[1]), Number(bounds[2]), Number(bounds[3])] as [number, number, number, number])
          : DEFAULT_ZONE_BOUNDS;
      const summed: ZoneSeconds = [0, 0, 0, 0, 0];
      let found = false;
      for (const sample of samples ?? []) {
        if (!sample.hr) continue;
        const stream: Stream = { t: sample.t, d: sample.d, hr: sample.hr, v: null, alt: null, lat: null, lon: null, moving: null };
        const computed = zonesFromStream(stream, maxHr, zoneBounds);
        if (!computed) continue;
        found = true;
        const zones: ZoneSeconds = computed;
        summed[0] += zones[0];
        summed[1] += zones[1];
        summed[2] += zones[2];
        summed[3] += zones[3];
        summed[4] += zones[4];
      }
      if (found) zoneSeconds = summed;
    }
  }
  const zonesAnswer = zoneSeconds
    ? "This week's heart-rate zones"
    : maxHr == null && zonesHaveHr
      ? "Heart rate is on this week's runs. Set max heart rate in Settings so zones can be read."
      : zonesHaveHr
        ? "Heart rate is on this week's runs. Zones were not saved on the last sync."
        : "No heart rate on this week's runs";

  return {
    range,
    targetMinKm,
    targetMaxKm,
    maxHr: profile.data?.max_hr ?? null,
    volumeWeeks,
    volumeAnswer,
    efficiency,
    efficiencyAnswer,
    efforts: effortRows,
    effortsAnswer,
    curve,
    curveLoops,
    curveAnswer,
    zoneSeconds,
    zonesHaveHr,
    zonesAnswer,
    days,
    daysSinceLegDay,
    calendarAnswer,
  };
}
