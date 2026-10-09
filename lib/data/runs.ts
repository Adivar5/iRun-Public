// built to spec
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  DEFAULT_ZONE_BOUNDS,
  zoneSeconds as zonesFromStream,
  type RunKind,
  type Stream,
  type ZoneSeconds,
} from "@/supabase/functions/_shared/metrics/index.ts";

import { asRunKind, paceSeconds, shownHeartRate, similarRunDelta } from "./today";

export type RunRow = {
  id: string;
  startAt: string;
  distanceM: number;
  paceSPerKm: number;
  runKind: RunKind | null;
  splitsPace: number[];
  loopName: string | null;
};

export type RunDetail = {
  id: string;
  startAt: string;
  distanceM: number;
  durationS: number;
  paceSPerKm: number;
  avgHr: number | null;
  runKind: RunKind | null;
  samples: {
    t: number[];
    d: number[];
    hr: (number | null)[] | null;
    v: (number | null)[] | null;
    alt: (number | null)[] | null;
    lat: (number | null)[] | null;
    lon: (number | null)[] | null;
  } | null;
  splits: { kmIndex: number; paceSPerKm: number; avgHr: number | null }[];
  zoneSeconds: ZoneSeconds | null;
  deltaVsSimilarSPerKm: number | null;
};

const WORKOUT_LIST = "id, start_at, distance_m, duration_s, moving_s, run_kind";

async function splitPaces(sb: SupabaseClient<Database>, workoutIds: string[]): Promise<Map<string, number[]>> {
  const grouped = new Map<string, { km: number; pace: number }[]>();
  if (workoutIds.length === 0) return new Map();
  const { data, error } = await sb
    .from("splits")
    .select("workout_id, km_index, pace_s_per_km")
    .in("workout_id", workoutIds)
    .order("km_index", { ascending: true });
  if (error) throw new Error("Could not load splits");
  for (const row of data ?? []) {
    const list = grouped.get(row.workout_id) ?? [];
    list.push({ km: row.km_index, pace: row.pace_s_per_km });
    grouped.set(row.workout_id, list);
  }
  const paces = new Map<string, number[]>();
  for (const [id, list] of grouped) {
    paces.set(
      id,
      list.sort((a, b) => a.km - b.km).map((item) => item.pace),
    );
  }
  return paces;
}

async function loopNames(sb: SupabaseClient<Database>, workoutIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (workoutIds.length === 0) return names;
  const { data: links, error } = await sb.from("workout_loops").select("workout_id, loop_id").in("workout_id", workoutIds);
  if (error) throw new Error("Could not load loops");
  const loopIds = [...new Set((links ?? []).map((link) => link.loop_id))];
  if (loopIds.length === 0) return names;
  const { data: loops, error: loopError } = await sb.from("loops").select("id, name").in("id", loopIds);
  if (loopError) throw new Error("Could not load loops");
  const byId = new Map((loops ?? []).map((loop) => [loop.id, loop.name]));
  for (const link of links ?? []) {
    const name = byId.get(link.loop_id);
    if (name) names.set(link.workout_id, name);
  }
  return names;
}

export async function getRuns(sb: SupabaseClient<Database>, filter: "all" | RunKind): Promise<RunRow[]> {
  const query = sb.from("workouts").select(WORKOUT_LIST).eq("type", "run").order("start_at", { ascending: false });
  const filtered = filter === "all" ? query : query.eq("run_kind", filter);
  const { data, error } = await filtered;
  if (error) throw new Error("Could not load runs");
  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [paces, names] = await Promise.all([splitPaces(sb, ids), loopNames(sb, ids)]);
  return rows.map((row) => ({
    id: row.id,
    startAt: row.start_at,
    distanceM: row.distance_m,
    paceSPerKm: paceSeconds(row),
    runKind: asRunKind(row.run_kind),
    splitsPace: paces.get(row.id) ?? [],
    loopName: names.get(row.id) ?? null,
  }));
}

function zoneTuple(avgHr: number | null, raw: number[] | null): ZoneSeconds | null {
  if (avgHr == null || raw == null || raw.length !== 5) return null;
  if (raw.some((value) => !Number.isFinite(value))) return null;
  return [raw[0]!, raw[1]!, raw[2]!, raw[3]!, raw[4]!];
}

function boundsOf(raw: number[] | null): [number, number, number, number] {
  if (!raw || raw.length !== 4 || raw.some((value) => !Number.isFinite(Number(value)))) return DEFAULT_ZONE_BOUNDS;
  return [Number(raw[0]), Number(raw[1]), Number(raw[2]), Number(raw[3])];
}

function zonesFromSamples(
  stored: ZoneSeconds | null,
  samples: { t: number[]; d: number[]; hr: (number | null)[] | null } | null,
  maxHr: number | null,
  bounds: number[] | null,
): ZoneSeconds | null {
  if (stored) return stored;
  if (!samples?.hr || maxHr == null) return null;
  const stream: Stream = {
    t: samples.t,
    d: samples.d,
    hr: samples.hr,
    v: null,
    alt: null,
    lat: null,
    lon: null,
    moving: null,
  };
  return zonesFromStream(stream, maxHr, boundsOf(bounds));
}

export async function getRunDetail(sb: SupabaseClient<Database>, id: string): Promise<RunDetail | null> {
  const { data: workout, error } = await sb
    .from("workouts")
    .select("id, start_at, distance_m, duration_s, moving_s, avg_hr, has_hr, run_kind, zone_seconds")
    .eq("id", id)
    .eq("type", "run")
    .maybeSingle();
  if (error) throw new Error("Could not load the run");
  if (!workout) return null;

  const [samples, splits, earlier, profile] = await Promise.all([
    sb.from("workout_samples").select("t, d, hr, v, alt, lat, lon").eq("workout_id", id).maybeSingle(),
    sb.from("splits").select("km_index, pace_s_per_km, avg_hr").eq("workout_id", id).order("km_index", { ascending: true }),
    sb
      .from("workouts")
      .select("distance_m, duration_s, moving_s")
      .eq("type", "run")
      .lt("start_at", workout.start_at)
      .order("start_at", { ascending: false })
      .limit(40),
    sb.from("profiles").select("max_hr, zone_bounds").maybeSingle(),
  ]);
  if (samples.error) throw new Error("Could not load the run");
  if (splits.error) throw new Error("Could not load the run");
  if (earlier.error) throw new Error("Could not load the run");
  if (profile.error) throw new Error("Could not load the run");

  const avgHr = shownHeartRate(workout.avg_hr, workout.has_hr);
  const paceSPerKm = paceSeconds(workout);
  const sampleRow = samples.data;
  return {
    id: workout.id,
    startAt: workout.start_at,
    distanceM: workout.distance_m,
    durationS: workout.duration_s,
    paceSPerKm,
    avgHr,
    runKind: asRunKind(workout.run_kind),
    samples: sampleRow
      ? {
          t: sampleRow.t,
          d: sampleRow.d,
          hr: avgHr == null ? null : sampleRow.hr,
          v: sampleRow.v,
          alt: sampleRow.alt,
          lat: sampleRow.lat,
          lon: sampleRow.lon,
        }
      : null,
    splits: (splits.data ?? []).map((split) => ({
      kmIndex: split.km_index,
      paceSPerKm: split.pace_s_per_km,
      avgHr: shownHeartRate(split.avg_hr, split.avg_hr != null && split.avg_hr > 0),
    })),
    zoneSeconds: zonesFromSamples(
      zoneTuple(avgHr, workout.zone_seconds),
      sampleRow,
      profile.data?.max_hr ?? null,
      profile.data?.zone_bounds ?? null,
    ),
    deltaVsSimilarSPerKm: similarRunDelta(
      { distanceM: workout.distance_m, paceSPerKm },
      (earlier.data ?? []).map((row) => ({ distanceM: row.distance_m, paceSPerKm: paceSeconds(row) })),
    ),
  };
}
