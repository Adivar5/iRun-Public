import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const EXPORT_TABLES = [
  "profiles",
  "workouts",
  "workout_samples",
  "splits",
  "best_efforts",
  "loops",
  "workout_loops",
  "weekly_summaries",
  "insights",
  "sync_log",
  "import_jobs",
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

function cell(value: unknown): string {
  if (value == null) return "";
  let text: string;
  if (typeof value === "string") text = /^[=+\-@\t]/.test(value) ? `'${value}` : value;
  else if (typeof value === "number" || typeof value === "boolean") text = String(value);
  else text = JSON.stringify(value) ?? "";
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const first = rows[0];
  if (!first) return "";
  const keys = Object.keys(first);
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map((key) => cell(row[key])).join(","));
  return lines.join("\n");
}

export async function assertAal2(sb: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") throw new Error("aal2_required");
}

export async function exportAll(
  sb: SupabaseClient<Database>,
): Promise<{ json: string; csv: Record<string, string> }> {
  await assertAal2(sb);
  const data: Record<string, Record<string, unknown>[]> = {};
  const csv: Record<string, string> = {};
  for (const table of EXPORT_TABLES) {
    const { data: rows, error } = await sb.from(table).select("*");
    if (error) throw new Error("export_failed");
    const list = (rows ?? []) as Record<string, unknown>[];
    data[table] = list;
    csv[table] = toCsv(list);
  }
  return { json: JSON.stringify(data), csv };
}

export async function deleteOwnedRows(sb: SupabaseClient<Database>, userId: string): Promise<void> {
  await assertAal2(sb);
  for (const table of EXPORT_TABLES) {
    const { error } = await sb.from(table).delete().eq("user_id", userId);
    if (error) throw new Error("delete_failed");
  }
}
