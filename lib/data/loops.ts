import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/database.types";
import { paceSeconds } from "@/lib/data/today";

export type LoopSummary = {
  id: string;
  name: string;
  distanceM: number;
  attempts: number;
  bestPaceS: number;
  latestPaceS: number;
  trend: number[];
  sig: { lat: number[]; lon: number[] };
};

export type LoopAttempt = {
  id: string;
  startAt: string;
  distanceM: number;
  paceSPerKm: number;
  lat: number[] | null;
  lon: number[] | null;
};

function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function readSignature(value: Json): { lat: number[]; lon: number[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { lat: [], lon: [] };
  return { lat: numbers(value.lat), lon: numbers(value.lon) };
}

export async function listLoops(sb: SupabaseClient<Database>): Promise<LoopSummary[]> {
  const { data: loops, error } = await sb.from("loops").select("id, name, typical_distance_m, signature").order("name");
  if (error) throw new Error("Could not load loops");
  const rows = loops ?? [];
  if (rows.length === 0) return [];

  const { data: members, error: memberError } = await sb.from("workout_loops").select("loop_id, workout_id");
  if (memberError) throw new Error("Could not load loop runs");
  const ids = [...new Set((members ?? []).map((member) => member.workout_id))];
  const { data: workouts, error: workoutError } =
    ids.length === 0
      ? { data: [], error: null }
      : await sb.from("workouts").select("id, start_at, distance_m, duration_s, moving_s").in("id", ids);
  if (workoutError) throw new Error("Could not load loop runs");
  const byId = new Map((workouts ?? []).map((workout) => [workout.id, workout]));

  return rows.map((loop) => {
    const attempts = (members ?? [])
      .filter((member) => member.loop_id === loop.id)
      .map((member) => byId.get(member.workout_id))
      .filter((workout): workout is NonNullable<typeof workout> => workout != null)
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
    const paces = attempts.map((workout) => paceSeconds(workout));
    const latest = attempts.at(-1);
    return {
      id: loop.id,
      name: loop.name,
      distanceM: loop.typical_distance_m,
      attempts: attempts.length,
      bestPaceS: paces.length === 0 ? 0 : Math.min(...paces),
      latestPaceS: latest ? paceSeconds(latest) : 0,
      trend: paces,
      sig: readSignature(loop.signature),
    };
  });
}

export async function getLoop(
  sb: SupabaseClient<Database>,
  id: string,
): Promise<{ loop: LoopSummary; attempts: Omit<LoopAttempt, "lat" | "lon">[] } | null> {
  const loops = await listLoops(sb);
  const loop = loops.find((item) => item.id === id);
  if (!loop) return null;
  const { data: members, error } = await sb.from("workout_loops").select("workout_id").eq("loop_id", id);
  if (error) throw new Error("Could not load this loop");
  const ids = (members ?? []).map((member) => member.workout_id);
  if (ids.length === 0) return { loop, attempts: [] };
  const { data, error: workoutError } = await sb
    .from("workouts")
    .select("id, start_at, distance_m, duration_s, moving_s")
    .in("id", ids)
    .order("start_at", { ascending: false });
  if (workoutError) throw new Error("Could not load this loop");
  return {
    loop,
    attempts: (data ?? []).map((workout) => ({
      id: workout.id,
      startAt: workout.start_at,
      distanceM: workout.distance_m,
      paceSPerKm: paceSeconds(workout),
    })),
  };
}

export async function loopRoutes(
  sb: SupabaseClient<Database>,
  ids: string[],
): Promise<{ id: string; lat: (number | null)[] | null; lon: (number | null)[] | null }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await sb.from("workout_samples").select("workout_id, lat, lon").in("workout_id", ids);
  if (error) throw new Error("Could not load the routes");
  return (data ?? []).map((row) => ({ id: row.workout_id, lat: row.lat, lon: row.lon }));
}
