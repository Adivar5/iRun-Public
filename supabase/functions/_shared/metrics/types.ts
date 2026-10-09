export interface Stream {
  t: number[];
  d: number[];
  hr: (number | null)[] | null;
  v: (number | null)[] | null;
  alt: (number | null)[] | null;
  lat: (number | null)[] | null;
  lon: (number | null)[] | null;
  moving: boolean[] | null;
}

export interface Split {
  kmIndex: number;
  paceSPerKm: number;
  avgHr: number | null;
}

export type ZoneSeconds = [number, number, number, number, number];

export type RunKind = "easy" | "tempo" | "long" | "intervals" | "other";

export interface WorkoutLite {
  startAt: string;
  type: "run" | "strength" | "other";
  distanceM: number;
  durationS: number;
  movingS: number | null;
  avgHr: number | null;
  runKind: RunKind | null;
  load: number | null;
  efficiency: number | null;
  zoneSeconds: ZoneSeconds | null;
}

export interface WeeklySummary {
  weekStart: string;
  km: number;
  runCount: number;
  durationS: number;
  load: number | null;
  longRunKm: number;
  avgEfficiency: number | null;
  zoneSeconds: ZoneSeconds;
}

export const MAX_RUN_SPEED_MPS = 8;

export const DEFAULT_ZONE_BOUNDS: [number, number, number, number] = [0.6, 0.7, 0.8, 0.9];
