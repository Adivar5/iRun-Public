import { sql } from "../db.ts";
import { log } from "../http.ts";
import { buildPrompt, type InsightInput } from "./prompt.ts";
import { parseInsights, type InsightCardT } from "./schema.ts";

export type Claude = (p: { system: string; user: string }) => Promise<{ text: string; inputTokens: number; outputTokens: number }>;

export type InsightStatus = "ok" | "skipped" | "budget" | "rate_limited";

const ZONE = "Asia/Jerusalem";

type WeekRow = {
  week_start: string | Date;
  km: number;
  run_count: number;
  duration_s: number;
  load: number | null;
  long_run_km: number | null;
  avg_efficiency: number | null;
  zone_seconds: number[] | null;
};

function jerusalemDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function weekStart(now: Date): string {
  const [year, month, day] = jerusalemDate(now).split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const weekday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return date.toISOString().slice(0, 10);
}

function dayText(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function weekRecord(row: WeekRow): InsightInput["weeks"][number] {
  const week: InsightInput["weeks"][number] = {
    week_start: dayText(row.week_start),
    km: row.km,
    run_count: row.run_count,
    duration_s: row.duration_s,
  };
  if (row.load != null) week.load = row.load;
  if (row.long_run_km != null) week.long_run_km = row.long_run_km;
  if (row.avg_efficiency != null) week.avg_efficiency = row.avg_efficiency;
  if (row.zone_seconds != null) week.zone_seconds = row.zone_seconds;
  return week;
}

function effortKind(kind: string): "exact" | "equivalent" | null {
  switch (kind) {
    case "exact":
    case "equivalent":
      return kind;
    default:
      return null;
  }
}

async function loadInput(userId: string): Promise<InsightInput> {
  const weeks = await sql<WeekRow[]>`
    select week_start, km, run_count, duration_s, load, long_run_km, avg_efficiency, zone_seconds
    from public.weekly_summaries
    where user_id = ${userId}
    order by week_start desc
    limit 12`;
  const efforts = await sql<{ distance_label: string; kind: string; elapsed_s: number }[]>`
    select distance_label, kind, min(elapsed_s) as elapsed_s
    from public.best_efforts
    where user_id = ${userId} and kind in ('exact', 'equivalent')
    group by distance_label, kind`;
  const [profile] = await sql<{ goal_5k_pace_s_per_km: number; weekly_km_target_min: number; weekly_km_target_max: number }[]>`
    select goal_5k_pace_s_per_km, weekly_km_target_min, weekly_km_target_max
    from public.profiles where user_id = ${userId}`;
  const [best] = await sql<{ elapsed_s: number; distance_m: number }[]>`
    select elapsed_s, distance_m from public.best_efforts
    where user_id = ${userId} and distance_label = '5k' and kind = 'exact'
    order by elapsed_s asc
    limit 1`;
  const bestEfforts: InsightInput["bestEfforts"] = [];
  for (const row of efforts) {
    const kind = effortKind(row.kind);
    if (kind) bestEfforts.push({ label: row.distance_label, kind, elapsedS: row.elapsed_s });
  }
  return {
    weeks: weeks.reverse().map(weekRecord),
    bestEfforts,
    goal: {
      goal5kPaceSPerKm: profile?.goal_5k_pace_s_per_km ?? 260,
      best5kPaceSPerKm: best != null && best.distance_m > 0 ? best.elapsed_s / (best.distance_m / 1000) : null,
    },
    targets: { min: profile?.weekly_km_target_min ?? 30, max: profile?.weekly_km_target_max ?? 40 },
  };
}

async function store(
  userId: string,
  now: Date,
  trigger: "cron" | "manual",
  status: "ok" | "skipped" | "budget",
  payload: InsightCardT[],
  tokens: { input: number | null; output: number | null },
) {
  const model = Deno.env.get("INSIGHTS_MODEL") ?? "claude-sonnet-5-5";
  await sql`
    insert into public.insights (user_id, week_start, payload, model, input_tokens, output_tokens, trigger, status)
    values (
      ${userId},
      ${weekStart(now)},
      ${sql.json(payload)},
      ${model},
      ${tokens.input},
      ${tokens.output},
      ${trigger},
      ${status}
    )`;
}

function finish(status: InsightStatus, started: number, inputTokens = 0, outputTokens = 0): { status: InsightStatus } {
  log("insights", { status, input_tokens: inputTokens, output_tokens: outputTokens, duration_ms: Date.now() - started });
  return { status };
}

export async function runInsightsJob(
  userId: string,
  opts: { trigger: "cron" | "manual"; claude: Claude; now?: Date },
): Promise<{ status: InsightStatus }> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  if (opts.trigger === "manual") {
    const day = jerusalemDate(now);
    const [count] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.insights
      where user_id = ${userId} and trigger = 'manual'
        and (created_at at time zone 'Asia/Jerusalem')::date = ${day}::date`;
    if ((count?.n ?? 0) >= 3) return finish("rate_limited", started);
  }

  const budgetRaw = Deno.env.get("INSIGHTS_MONTHLY_TOKEN_BUDGET");
  const budget = budgetRaw == null || budgetRaw === "" ? null : Number(budgetRaw);
  if (budget != null && Number.isFinite(budget)) {
    const monthStart = `${jerusalemDate(now).slice(0, 7)}-01`;
    const [spent] = await sql<{ tokens: number }[]>`
      select coalesce(sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)), 0)::int as tokens
      from public.insights
      where user_id = ${userId}
        and (created_at at time zone 'Asia/Jerusalem')::date >= ${monthStart}::date`;
    if ((spent?.tokens ?? 0) >= budget) {
      await store(userId, now, opts.trigger, "budget", [], { input: null, output: null });
      return finish("budget", started);
    }
  }

  const prompt = buildPrompt(await loadInput(userId));
  const first = await opts.claude(prompt);
  let parsed = parseInsights(first.text);
  let inputTokens = first.inputTokens;
  let outputTokens = first.outputTokens;
  if (!parsed.ok) {
    const second = await opts.claude(prompt);
    parsed = parseInsights(second.text);
    inputTokens += second.inputTokens;
    outputTokens += second.outputTokens;
  }
  if (!parsed.ok) {
    await store(userId, now, opts.trigger, "skipped", [], { input: inputTokens, output: outputTokens });
    return finish("skipped", started, inputTokens, outputTokens);
  }
  await store(userId, now, opts.trigger, "ok", parsed.cards, { input: inputTokens, output: outputTokens });
  return finish("ok", started, inputTokens, outputTokens);
}
