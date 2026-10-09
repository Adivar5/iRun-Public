import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/database.types";
import { InsightBatch, type InsightCardT } from "@/supabase/functions/_shared/insights/schema";

export type InsightWeek = {
  weekStart: string;
  status: "ok" | "skipped" | "budget";
  cards: InsightCardT[];
  at: string;
};

const ZONE = "Asia/Jerusalem";

function jerusalemDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function asStatus(value: string): InsightWeek["status"] | null {
  switch (value) {
    case "ok":
    case "skipped":
    case "budget":
      return value;
    default:
      return null;
  }
}

function cardsFrom(payload: Json): InsightCardT[] {
  const parsed = InsightBatch.safeParse(payload);
  return parsed.success ? parsed.data : [];
}

export function refreshesLeft(manualToday: number): number {
  return Math.max(0, 3 - manualToday);
}

export async function getInsights(sb: SupabaseClient<Database>): Promise<{ weeks: InsightWeek[]; refreshesLeft: number }> {
  const { data, error } = await sb
    .from("insights")
    .select("week_start, status, payload, created_at, trigger")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load insights");

  const today = jerusalemDate(new Date());
  const byWeek = new Map<string, InsightWeek>();
  let manualToday = 0;
  for (const row of data ?? []) {
    const status = asStatus(row.status);
    if (!status) continue;
    if (row.trigger === "manual" && jerusalemDate(new Date(row.created_at)) === today) manualToday += 1;
    if (byWeek.has(row.week_start)) continue;
    byWeek.set(row.week_start, {
      weekStart: row.week_start,
      status,
      cards: status === "ok" ? cardsFrom(row.payload) : [],
      at: row.created_at,
    });
  }
  const weeks = [...byWeek.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return { weeks, refreshesLeft: refreshesLeft(manualToday) };
}
