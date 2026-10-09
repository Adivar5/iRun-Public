export const ALLOWED_WEEK_FIELDS = [
  "week_start",
  "km",
  "run_count",
  "duration_s",
  "load",
  "long_run_km",
  "avg_efficiency",
  "zone_seconds",
] as const;

export type InsightInput = {
  weeks: Partial<Record<(typeof ALLOWED_WEEK_FIELDS)[number], unknown>>[];
  bestEfforts: { label: string; kind: "exact" | "equivalent"; elapsedS: number }[];
  goal: { goal5kPaceSPerKm: number; best5kPaceSPerKm: number | null };
  targets: { min: number; max: number };
};

const CARD_SCHEMA =
  '[{"id":"string","type":"progress|risk|coach","title":"string<=40","value":"number","unit":"string","delta":"number","direction":"up|down|flat","status":"good|watch|alert","chart":{"kind":"line|bars|ring|heatmap","series":"string","range_days":"number"},"why":"string<=140","action":"string<=100","confidence":"low|medium|high"}]';

function assertWeekKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertWeekKeys(item);
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (!ALLOWED_WEEK_FIELDS.includes(key as (typeof ALLOWED_WEEK_FIELDS)[number])) {
      throw new Error(`not allowlisted: ${key}`);
    }
    assertWeekKeys((value as Record<string, unknown>)[key]);
  }
}

export function buildPrompt(input: InsightInput): { system: string; user: string } {
  assertWeekKeys(input.weeks);
  return {
    system: `You are a running coach for one athlete. Explain and prioritize the numbers. Do not diagnose or make medical claims. Output only a JSON array of 3 to 5 cards matching this schema: ${CARD_SCHEMA}`,
    user: JSON.stringify({
      weeks: input.weeks,
      bestEfforts: input.bestEfforts,
      goal: input.goal,
      targets: input.targets,
    }),
  };
}
