import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { localDate, weekStartLocal } from "@/supabase/functions/_shared/metrics/index.ts";

import { shownHeartRate } from "./today";

export type StrengthSession = {
  id: string;
  name: string;
  startAt: string;
  durationS: number;
  setCount: number;
  avgHr: number | null;
  energyKcal: number | null;
  legDay: boolean;
};

export type StrengthSet = { setIndex: number; weightKg: number | null; reps: number | null };
export type StrengthExercise = { name: string; sets: StrengthSet[] };

type SetRow = {
  exercise_name: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
};

export function countsAsLegDay(name: string | null, flagged: boolean, source: string | null = null): boolean {
  if (source === "user") return flagged;
  if (flagged) return true;
  return /\blegs?\b/i.test(name ?? "");
}

export function groupExercises(rows: SetRow[]): StrengthExercise[] {
  const order: string[] = [];
  const byName = new Map<string, StrengthSet[]>();
  for (const row of [...rows].sort((a, b) => a.set_index - b.set_index)) {
    let sets = byName.get(row.exercise_name);
    if (!sets) {
      sets = [];
      byName.set(row.exercise_name, sets);
      order.push(row.exercise_name);
    }
    sets.push({ setIndex: row.set_index, weightKg: row.weight_kg, reps: row.reps });
  }
  return order.map((name) => ({ name, sets: byName.get(name) ?? [] }));
}

type WorkoutRow = {
  id: string;
  name: string | null;
  start_at: string;
  duration_s: number;
  avg_hr: number | null;
  has_hr: boolean;
  energy_kcal: number | null;
  is_leg_day: boolean;
  leg_day_source: string | null;
};

function toSession(row: WorkoutRow, setCount: number): StrengthSession {
  return {
    id: row.id,
    name: row.name?.trim() || "Strength",
    startAt: row.start_at,
    durationS: row.duration_s,
    setCount,
    avgHr: shownHeartRate(row.avg_hr, row.has_hr),
    energyKcal: row.energy_kcal != null && row.energy_kcal > 0 ? row.energy_kcal : null,
    legDay: countsAsLegDay(row.name, row.is_leg_day, row.leg_day_source),
  };
}

async function setCounts(sb: SupabaseClient<Database>, ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const { data, error } = await sb.from("strength_sets").select("workout_id").in("workout_id", ids);
  if (error) throw new Error("Could not load strength sets");
  for (const row of data ?? []) counts.set(row.workout_id, (counts.get(row.workout_id) ?? 0) + 1);
  return counts;
}

const SESSION_COLUMNS = "id, name, start_at, duration_s, avg_hr, has_hr, energy_kcal, is_leg_day, leg_day_source";

export async function listStrength(sb: SupabaseClient<Database>): Promise<StrengthSession[]> {
  const { data, error } = await sb
    .from("workouts")
    .select(SESSION_COLUMNS)
    .eq("type", "strength")
    .order("start_at", { ascending: false })
    .limit(40);
  if (error) throw new Error("Could not load strength sessions");
  const rows = data ?? [];
  const counts = await setCounts(sb, rows.map((row) => row.id));
  return rows.map((row) => toSession(row, counts.get(row.id) ?? 0));
}

export async function latestStrength(sb: SupabaseClient<Database>): Promise<StrengthSession | null> {
  const { data, error } = await sb
    .from("workouts")
    .select(SESSION_COLUMNS)
    .eq("type", "strength")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load the latest strength session");
  if (!data) return null;
  const counts = await setCounts(sb, [data.id]);
  return toSession(data, counts.get(data.id) ?? 0);
}

export async function getStrengthSession(
  sb: SupabaseClient<Database>,
  id: string,
): Promise<{ session: StrengthSession; exercises: StrengthExercise[] } | null> {
  const { data, error } = await sb
    .from("workouts")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .eq("type", "strength")
    .maybeSingle();
  if (error) throw new Error("Could not load this session");
  if (!data) return null;
  const { data: sets, error: setsError } = await sb
    .from("strength_sets")
    .select("exercise_name, set_index, weight_kg, reps")
    .eq("workout_id", id)
    .order("set_index", { ascending: true });
  if (setsError) throw new Error("Could not load strength sets");
  const exercises = groupExercises(sets ?? []);
  const setCount = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  return { session: toSession(data, setCount), exercises };
}

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getStrengthHome(
  sb: SupabaseClient<Database>,
  now = new Date(),
): Promise<{
  sessions: StrengthSession[];
  days: { date: string; runKm: number; strength: boolean; legDay: boolean }[];
  hoursSinceLegDay: number | null;
}> {
  const sessions = await listStrength(sb);
  const start = weekStartLocal(now.toISOString());
  const fromDate = addUtcDays(start, -7 * 11);
  const { data, error } = await sb
    .from("workouts")
    .select("start_at, distance_m, type, is_leg_day, leg_day_source, name")
    .gte("start_at", `${fromDate}T00:00:00.000Z`)
    .order("start_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error("Could not load the training calendar");
  const days: { date: string; runKm: number; strength: boolean; legDay: boolean }[] = [];
  let cursor = fromDate;
  const today = localDate(now.toISOString());
  while (cursor <= today) {
    days.push({ date: cursor, runKm: 0, strength: false, legDay: false });
    cursor = addUtcDays(cursor, 1);
  }
  const index = new Map(days.map((day, i) => [day.date, i]));
  for (const row of data ?? []) {
    const day = days[index.get(localDate(row.start_at)) ?? -1];
    if (!day) continue;
    if (row.type === "run") day.runKm = Math.round((day.runKm + row.distance_m / 1000) * 10) / 10;
    if (row.type === "strength") day.strength = true;
    if (countsAsLegDay(row.name, row.is_leg_day, row.leg_day_source)) day.legDay = true;
  }
  const leg = [...(data ?? [])].reverse().find((row) => countsAsLegDay(row.name, row.is_leg_day, row.leg_day_source));
  const hoursSinceLegDay = leg == null ? null : Math.max(0, Math.floor((now.getTime() - Date.parse(leg.start_at)) / 3_600_000));
  return { sessions, days, hoursSinceLegDay };
}
