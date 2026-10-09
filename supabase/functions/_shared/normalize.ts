import type { RunKind, Stream } from "./metrics/types.ts";

export type StravaActivity = {
  id: number;
  type: string;
  sport_type?: string;
  name?: string | null;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  calories?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  workout_type?: number | null;
};

export type StravaStreams = Partial<Record<
  "time" | "distance" | "heartrate" | "latlng" | "altitude" | "velocity_smooth" | "cadence" | "moving",
  { data: unknown[] }
>>;

export type WorkoutRow = {
  source: "strava";
  source_id: string;
  type: "run" | "strength" | "other";
  start_at: string;
  duration_s: number;
  moving_s: number;
  distance_m: number;
  energy_kcal: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  has_hr: boolean;
};

export type StrengthSetIn = {
  exercise_name: string;
  muscle_groups: string[];
  weight?: { value: string; unit: string };
  reps?: { value: string; unit: string };
};

export type StrengthSetRow = {
  set_index: number;
  exercise_name: string;
  muscle_groups: string[];
  weight_kg: number | null;
  weight_unit_raw: string | null;
  reps: number | null;
  reps_unit_raw: string | null;
};

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const LEG_GROUPS = new Set(["Quads", "Hamstrings", "Glutes", "Calves", "Adductors"]);

function activityType(type: string): WorkoutRow["type"] {
  if (RUN_TYPES.has(type)) return "run";
  if (type === "WeightTraining") return "strength";
  return "other";
}

function runKindFrom(a: StravaActivity): RunKind {
  if (a.workout_type === 1) return "tempo";
  if (a.workout_type === 2) return "long";
  if (a.workout_type === 3) return "intervals";
  return inferUntaggedKind(a);
}

// ponytail: fixed cuts (12 km long, under 5:30/km tempo, moving/elapsed under 0.85 and under 8 km intervals).
// Swap for his goal pace once a profile threshold exists.
export function inferUntaggedRunKind(input: {
  distanceM: number;
  movingS: number;
  elapsedS: number;
  avgHr: number | null;
}): RunKind {
  return inferUntaggedKind({
    id: 0,
    type: "Run",
    start_date: "",
    elapsed_time: input.elapsedS,
    moving_time: input.movingS,
    distance: input.distanceM,
    average_heartrate: input.avgHr ?? undefined,
  });
}

function inferUntaggedKind(a: StravaActivity): RunKind {
  const km = a.distance / 1000;
  if (!(km > 0)) return "easy";
  const pace = a.moving_time / km;
  const movingShare = a.elapsed_time > 0 ? a.moving_time / a.elapsed_time : 1;
  if (km >= 12) return "long";
  if (km < 8 && movingShare < 0.85) return "intervals";
  if (a.average_heartrate != null && a.average_heartrate < 145) return "easy";
  if (pace < 330 && km >= 3) return "tempo";
  return "easy";
}

function leadingNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/.exec(raw);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeActivity(a: StravaActivity): {
  type: WorkoutRow["type"];
  runKind: RunKind | null;
  row: WorkoutRow;
  name: string | null;
} {
  const type = activityType(a.type);
  const avg = a.average_heartrate ?? null;
  const title = a.name?.trim();
  return {
    type,
    runKind: type === "run" ? runKindFrom(a) : null,
    name: type === "strength" && title ? title : null,
    row: {
      source: "strava",
      source_id: String(a.id),
      type,
      start_at: a.start_date,
      duration_s: a.elapsed_time,
      moving_s: a.moving_time,
      distance_m: a.distance,
      energy_kcal: a.calories ?? null,
      avg_hr: avg,
      max_hr: a.max_heartrate ?? null,
      elevation_gain_m: a.total_elevation_gain ?? null,
      has_hr: avg != null,
    },
  };
}

export function normalizeStrengthSets(sets: StrengthSetIn[]): StrengthSetRow[] {
  return sets.map((set, setIndex) => {
    const reps = leadingNumber(set.reps?.value);
    return {
      set_index: setIndex,
      exercise_name: set.exercise_name,
      muscle_groups: set.muscle_groups ?? [],
      weight_kg: leadingNumber(set.weight?.value),
      weight_unit_raw: set.weight?.unit ?? null,
      reps: reps == null ? null : Math.round(reps),
      reps_unit_raw: set.reps?.unit ?? null,
    };
  });
}

export function strengthIsLegDay(sets: StrengthSetRow[]): boolean {
  return sets.some((set) => set.muscle_groups.some((group) => LEG_GROUPS.has(group)));
}

function numbers(data: unknown[] | undefined): number[] | null {
  if (!data) return null;
  return data.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value))).map((value) => (
    Number.isFinite(value) ? value : 0
  ));
}

function nullableNumbers(data: unknown[]): (number | null)[] {
  return data.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : null));
}

export function toStream(s: StravaStreams): Stream {
  let lat: (number | null)[] | null = null;
  let lon: (number | null)[] | null = null;
  if (s.latlng?.data) {
    lat = [];
    lon = [];
    for (const point of s.latlng.data) {
      if (Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number") {
        lat.push(point[0]);
        lon.push(point[1]);
      } else {
        lat.push(null);
        lon.push(null);
      }
    }
  }
  return {
    t: numbers(s.time?.data) ?? [],
    d: numbers(s.distance?.data) ?? [],
    hr: s.heartrate ? nullableNumbers(s.heartrate.data) : null,
    v: s.velocity_smooth ? nullableNumbers(s.velocity_smooth.data) : null,
    alt: s.altitude ? nullableNumbers(s.altitude.data) : null,
    lat,
    lon,
    moving: s.moving ? s.moving.data.map((value) => value === true) : null,
  };
}
