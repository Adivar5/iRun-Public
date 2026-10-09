// built to spec
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { localDate, weekStartLocal, type RunKind } from "@/supabase/functions/_shared/metrics/index.ts";

export type HeroRun = {
  id: string;
  startAt: string;
  runKind: RunKind | null;
  distanceM: number;
  paceSPerKm: number;
  avgHr: number | null;
  lat: (number | null)[] | null;
  lon: (number | null)[] | null;
  speed: (number | null)[] | null;
  deltaVsSimilarSPerKm: number | null;
};

const RUN_KINDS = ["easy", "tempo", "long", "intervals", "other"] as const satisfies readonly RunKind[];

export function asRunKind(value: string | null): RunKind | null {
  if (value == null) return null;
  for (const kind of RUN_KINDS) {
    if (kind === value) return kind;
  }
  return null;
}

export function paceSeconds(row: { distance_m: number; moving_s: number | null; duration_s: number }): number {
  if (row.distance_m <= 0) return 0;
  const seconds = row.moving_s != null && row.moving_s > 0 ? row.moving_s : row.duration_s;
  return (seconds * 1000) / row.distance_m;
}

export function shownHeartRate(avg: number | null, hasHr: boolean): number | null {
  if (!hasHr || avg == null || !Number.isFinite(avg) || avg <= 0) return null;
  return avg;
}

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildWeek(
  runs: { startAt: string; distanceM: number }[],
  now: Date,
): { days: { date: string; km: number }[]; todayIndex: number } {
  const start = weekStartLocal(now.toISOString());
  const days = Array.from({ length: 7 }, (_, index) => ({ date: addUtcDays(start, index), km: 0 }));
  const indexByDate = new Map(days.map((day, index) => [day.date, index]));
  for (const run of runs) {
    const index = indexByDate.get(localDate(run.startAt));
    if (index == null) continue;
    const day = days[index];
    if (!day) continue;
    day.km = Math.round((day.km + run.distanceM / 1000) * 100) / 100;
  }
  return { days, todayIndex: indexByDate.get(localDate(now.toISOString())) ?? 0 };
}

/** `previous` is newest first. Returns hero pace minus that run, in s/km. Negative means faster. */
export function similarRunDelta(
  hero: { distanceM: number; paceSPerKm: number },
  previous: { distanceM: number; paceSPerKm: number }[],
): number | null {
  if (hero.distanceM <= 0) return null;
  const match = previous.find((run) => Math.abs(run.distanceM - hero.distanceM) / hero.distanceM <= 0.15);
  if (!match) return null;
  return hero.paceSPerKm - match.paceSPerKm;
}

async function loadHero(sb: SupabaseClient<Database>): Promise<HeroRun | null> {
  const { data: workout, error } = await sb
    .from("workouts")
    .select("id, start_at, run_kind, distance_m, duration_s, moving_s, avg_hr, has_hr")
    .eq("type", "run")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load the latest run");
  if (!workout) return null;

  const earlier = await sb
    .from("workouts")
    .select("distance_m, duration_s, moving_s")
    .eq("type", "run")
    .lt("start_at", workout.start_at)
    .order("start_at", { ascending: false })
    .limit(40);
  if (earlier.error) throw new Error("Could not load similar runs");

  const paceSPerKm = paceSeconds(workout);
  return {
    id: workout.id,
    startAt: workout.start_at,
    runKind: asRunKind(workout.run_kind),
    distanceM: workout.distance_m,
    paceSPerKm,
    avgHr: shownHeartRate(workout.avg_hr, workout.has_hr),
    lat: null,
    lon: null,
    speed: null,
    deltaVsSimilarSPerKm: similarRunDelta(
      { distanceM: workout.distance_m, paceSPerKm },
      (earlier.data ?? []).map((row) => ({ distanceM: row.distance_m, paceSPerKm: paceSeconds(row) })),
    ),
  };
}

async function loadWeekRuns(sb: SupabaseClient<Database>, now: Date) {
  const start = weekStartLocal(now.toISOString());
  const from = new Date(`${start}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() - 2);
  const until = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const { data, error } = await sb
    .from("workouts")
    .select("start_at, distance_m")
    .eq("type", "run")
    .gte("start_at", from.toISOString())
    .lte("start_at", until.toISOString());
  if (error) throw new Error("Could not load this week");
  return (data ?? []).map((row) => ({ startAt: row.start_at, distanceM: row.distance_m }));
}

async function loadTarget(sb: SupabaseClient<Database>): Promise<{ min: number; max: number }> {
  const { data, error } = await sb.from("profiles").select("weekly_km_target_min, weekly_km_target_max").maybeSingle();
  if (error) throw new Error("Could not load the weekly target");
  return { min: data?.weekly_km_target_min ?? 30, max: data?.weekly_km_target_max ?? 40 };
}

export async function getTodayData(
  sb: SupabaseClient<Database>,
  now = new Date(),
): Promise<{
  hero: HeroRun | null;
  week: { days: { date: string; km: number }[]; todayIndex: number };
  target: { min: number; max: number };
}> {
  const [hero, weekRuns, target] = await Promise.all([
    loadHero(sb),
    loadWeekRuns(sb, now),
    loadTarget(sb),
  ]);
  return { hero, week: buildWeek(weekRuns, now), target };
}

export type TodayStat = {
  label: string;
  value: string;
  unit: string;
  series: number[];
  delta: { value: string; unit: string; direction: "up" | "down" | "flat"; good: boolean | null } | null;
};

function statDelta(current: number, previous: number | undefined, unit: string, upIsGood: boolean): TodayStat["delta"] {
  if (previous == null) return null;
  const gap = Math.round((current - previous) * 10) / 10;
  if (gap === 0) return { value: "0", unit, direction: "flat", good: null };
  const up = gap > 0;
  return { value: String(Math.abs(gap)), unit, direction: up ? "up" : "down", good: up === upIsGood };
}

export type GoalRingData = {
  effortName: string;
  goalPaceS: number;
  bestPaceS: number | null;
  source: "exact" | "equivalent" | null;
  reportedPaceS: number | null;
};

type EffortRow = {
  distance_label: string;
  kind: string;
  elapsed_s: number;
  distance_m: number;
  is_pb: boolean;
  workout_id: string;
};

function paceOf(row: EffortRow): number | null {
  if (row.distance_m <= 0) return null;
  if (row.kind !== "exact" && row.kind !== "equivalent" && row.kind !== "whole_run") return null;
  return row.elapsed_s / (row.distance_m / 1000);
}

function bestMatching(rows: EffortRow[], match: (row: EffortRow) => boolean): Pick<GoalRingData, "bestPaceS" | "source"> {
  let bestPaceS: number | null = null;
  let source: GoalRingData["source"] = null;
  for (const row of rows) {
    if (!match(row)) continue;
    const pace = paceOf(row);
    if (pace == null) continue;
    if (bestPaceS == null || pace < bestPaceS) {
      bestPaceS = pace;
      source = row.kind === "exact" || row.kind === "equivalent" ? row.kind : null;
    }
  }
  return { bestPaceS, source };
}

function kmName(metres: number): string {
  const km = Math.round(metres / 100) / 10;
  return Number.isInteger(km) ? `${km} km` : `${km} km`;
}

export async function getTodayProgress(
  sb: SupabaseClient<Database>,
  now = new Date(),
): Promise<{
  goals: GoalRingData[];
  freshPb: boolean;
  efficiency: TodayStat | null;
  longRun: TodayStat | null;
}> {
  const [profile, efforts, easy, longs] = await Promise.all([
    sb
      .from("profiles")
      .select(
        "goal_5k_pace_s_per_km, goal_10k_pace_s_per_km, goal_custom_distance_m, goal_custom_pace_s_per_km, reported_5k_pace_s_per_km",
      )
      .maybeSingle(),
    sb.from("best_efforts").select("distance_label, kind, elapsed_s, distance_m, is_pb, workout_id"),
    sb
      .from("workouts")
      .select("efficiency, start_at")
      .eq("type", "run")
      .in("run_kind", ["easy", "long"])
      .not("efficiency", "is", null)
      .order("start_at", { ascending: true })
      .limit(12),
    sb
      .from("workouts")
      .select("distance_m, start_at")
      .eq("type", "run")
      .eq("run_kind", "long")
      .order("start_at", { ascending: true })
      .limit(12),
  ]);
  if (profile.error || efforts.error || easy.error || longs.error) throw new Error("Could not load today's progress");

  const rows = (efforts.data ?? []) as EffortRow[];
  const five = bestMatching(rows, (row) => row.distance_label === "5k" && row.kind !== "whole_run");
  const ten = bestMatching(rows, (row) => row.distance_label === "10k" && row.kind !== "whole_run");
  const goals: GoalRingData[] = [
    {
      effortName: "5k",
      goalPaceS: profile.data?.goal_5k_pace_s_per_km ?? 260,
      ...five,
      reportedPaceS: profile.data?.reported_5k_pace_s_per_km ?? null,
    },
    {
      effortName: "10k",
      goalPaceS: profile.data?.goal_10k_pace_s_per_km ?? 300,
      ...ten,
      reportedPaceS: null,
    },
  ];
  const customMetres = profile.data?.goal_custom_distance_m;
  const customPace = profile.data?.goal_custom_pace_s_per_km;
  if (customMetres != null && customPace != null && customMetres > 0) {
    const custom = bestMatching(rows, (row) => Math.abs(row.distance_m - customMetres) / customMetres <= 0.02);
    goals.push({
      effortName: kmName(customMetres),
      goalPaceS: customPace,
      ...custom,
      reportedPaceS: null,
    });
  }

  const pb = rows.find((row) => row.distance_label === "5k" && row.kind === "exact" && row.is_pb);
  let freshPb = false;
  if (pb) {
    const { data: workout } = await sb.from("workouts").select("start_at").eq("id", pb.workout_id).maybeSingle();
    if (workout && now.getTime() - Date.parse(workout.start_at) <= 7 * 86_400_000) freshPb = true;
  }

  const easyValues = (easy.data ?? [])
    .map((row) => row.efficiency)
    .filter((value): value is number => value != null && value > 0);
  const latestEasy = easyValues.at(-1);
  const efficiency =
    latestEasy == null
      ? null
      : {
          label: "Efficiency",
          value: latestEasy.toFixed(2),
          unit: "m/beat",
          series: easyValues,
          delta: statDelta(latestEasy, easyValues.at(-2), "m/beat", true),
        };

  const longValues = (longs.data ?? []).map((row) => Math.round((row.distance_m / 1000) * 10) / 10);
  const latestLong = longValues.at(-1);
  const longRun =
    latestLong == null
      ? null
      : {
          label: "Long run",
          value: latestLong.toFixed(1),
          unit: "km",
          series: longValues,
          delta: statDelta(latestLong, longValues.at(-2), "km", true),
        };

  return { goals, freshPb, efficiency, longRun };
}
