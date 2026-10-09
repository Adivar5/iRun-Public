import { z } from "zod";

export type InsightCardT = {
  id: string;
  type: "progress" | "risk" | "coach";
  title: string;
  value: number;
  unit: string;
  delta: number;
  direction: "up" | "down" | "flat";
  status: "good" | "watch" | "alert";
  chart: { kind: "line" | "bars" | "ring" | "heatmap"; series: string; range_days: number };
  why: string;
  action: string;
  confidence: "low" | "medium" | "high";
};

const DIAGNOSIS = /diagnos|you have (an? )?injur|tendinitis|ITBS/i;

const cardSchema = z
  .object({
    id: z.string(),
    type: z.enum(["progress", "risk", "coach"]),
    title: z.string().max(40),
    value: z.number(),
    unit: z.string(),
    delta: z.number(),
    direction: z.enum(["up", "down", "flat"]),
    status: z.enum(["good", "watch", "alert"]),
    chart: z.object({
      kind: z.enum(["line", "bars", "ring", "heatmap"]),
      series: z.string(),
      range_days: z.number(),
    }),
    why: z.string().max(140),
    action: z.string().max(100),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict()
  .superRefine((card, ctx) => {
    if (DIAGNOSIS.test(card.why) || DIAGNOSIS.test(card.action)) {
      ctx.addIssue({ code: "custom", message: "diagnosis", path: ["why"] });
    }
  });

export const InsightCard: z.ZodType<InsightCardT> = cardSchema;
export const InsightBatch: z.ZodType<InsightCardT[]> = z.array(cardSchema).min(3).max(5);

function clip(value: unknown, max: number): unknown {
  return typeof value === "string" ? value.slice(0, max) : value;
}

function num(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return value;
  const match = value.trim().match(/^[+-]?\d+(?:\.\d+)?/);
  if (!match) return value;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalize(data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  return data.map((card) => {
    if (!card || typeof card !== "object") return card;
    const row = card as Record<string, unknown>;
    let chart: unknown = row.chart;
    if (chart && typeof chart === "object") {
      const record: Record<string, unknown> = { ...(chart as Record<string, unknown>) };
      record.range_days = num(record.range_days);
      chart = record;
    }
    return {
      ...row,
      title: clip(row.title, 40),
      why: clip(row.why, 140),
      action: clip(row.action, 100),
      value: num(row.value),
      delta: num(row.delta),
      chart,
    };
  });
}

export function parseInsights(text: string): { ok: true; cards: InsightCardT[] } | { ok: false } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  const parsed = InsightBatch.safeParse(normalize(data));
  return parsed.success ? { ok: true, cards: parsed.data } : { ok: false };
}
