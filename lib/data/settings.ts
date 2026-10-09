import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileValues } from "@/app/(app)/settings/schema";
import type { Database } from "@/lib/database.types";
import { assertAal2 } from "@/lib/data/export";

export type SyncStatus = "ok" | "error" | "skipped";

export type SyncLogEntry = {
  id: number;
  receivedAt: string;
  source: string;
  status: SyncStatus;
  count: number;
  error: string | null;
};

export type StravaConnection = {
  athleteId: number;
  webhookSubscriptionId: number | null;
  revokedAt: string | null;
  connectedAt: string;
};

export type BackfillJob = {
  status: "running" | "done" | "failed";
  progress: number;
  total: number | null;
  batchDone: number;
  waiting: number;
};

export function backfillCopy(job: BackfillJob): { label: string; done: number; total: number; showBar: boolean } {
  if (job.waiting > 0) {
    const total = job.batchDone + job.waiting;
    return { label: `${job.batchDone} of ${total} activities`, done: job.batchDone, total, showBar: true };
  }
  switch (job.status) {
    case "failed":
      return { label: "Backfill failed.", done: 0, total: 0, showBar: false };
    case "done":
      return { label: "Backfill finished.", done: job.total ?? 0, total: job.total ?? 0, showBar: false };
    case "running":
      if ((job.total ?? 0) === 0) {
        return { label: "No new activities in the last 7 days.", done: 0, total: 0, showBar: false };
      }
      return {
        label: `${job.progress} of ${job.total} activities`,
        done: job.progress,
        total: job.total ?? job.progress,
        showBar: true,
      };
    default: {
      const unexpected: never = job.status;
      return unexpected;
    }
  }
}

export type SkippedFile = { file: string; reason: string };

export const DEFAULT_PROFILE: ProfileValues = {
  maxHr: 190,
  restingHr: 55,
  goal5kPaceSPerKm: 260,
  goal10kPaceSPerKm: 300,
  customDistanceKm: null,
  customPaceSPerKm: null,
  weeklyKmMin: 30,
  weeklyKmMax: 40,
  zoneBounds: [0.6, 0.7, 0.8, 0.9],
};

export type SettingsLoad =
  | { ok: false }
  | {
      ok: true;
      profile: ProfileValues;
      profileSaved: boolean;
      connection: StravaConnection | null;
      logs: SyncLogEntry[];
      backfill: BackfillJob | null;
      archiveProgress: { done: number; total: number } | null;
      archiveSkipped: SkippedFile[];
    };

type NoticeCode = "connected" | "scope" | "error" | undefined;

export function stravaNotice(code: NoticeCode): string | null {
  switch (code) {
    case "connected":
      return "Strava is connected.";
    case "scope":
      return "Strava needs permission to read activities. Connect again and allow it.";
    case "error":
      return "Strava did not connect. Try again.";
    case undefined:
      return null;
    default: {
      const neverCode: never = code;
      return neverCode;
    }
  }
}

export function noticeCode(value: string | undefined): NoticeCode {
  if (value === "connected" || value === "scope" || value === "error") return value;
  return undefined;
}

export function showKeepOrDelete(
  connection: { revokedAt: string | null } | null,
  latest: { source: string; status: string; error: string | null; receivedAt: string } | null,
): boolean {
  if (!connection?.revokedAt || !latest) return false;
  const revokedAt = Date.parse(connection.revokedAt);
  const receivedAt = Date.parse(latest.receivedAt);
  if (!Number.isFinite(revokedAt) || !Number.isFinite(receivedAt) || receivedAt < revokedAt) return false;
  return latest.source === "strava" && latest.status === "ok" && latest.error == null;
}

export function skippedFromJob(error: unknown): SkippedFile[] {
  const source = Array.isArray(error)
    ? error
    : isRecord(error) && Array.isArray(error.skipped)
      ? error.skipped
      : [];
  const skipped: SkippedFile[] = [];
  for (const item of source) {
    if (!isRecord(item) || typeof item.file !== "string" || typeof item.reason !== "string") continue;
    skipped.push({ file: item.file, reason: item.reason });
  }
  return skipped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStatus(value: string): SyncStatus | null {
  if (value === "ok" || value === "error" || value === "skipped") return value;
  return null;
}

function asJobStatus(value: string): BackfillJob["status"] {
  if (value === "running" || value === "done" || value === "failed") return value;
  return "failed";
}

function boundsOf(value: readonly number[]): ProfileValues["zoneBounds"] | null {
  if (value.length !== 4) return null;
  const nums = value.map((item) => Number(item));
  if (nums.some((item) => !Number.isFinite(item))) return null;
  return [nums[0]!, nums[1]!, nums[2]!, nums[3]!];
}

function profileFrom(
  row: {
    max_hr: number | null;
    resting_hr: number | null;
    goal_5k_pace_s_per_km: number;
    goal_10k_pace_s_per_km: number;
    goal_custom_distance_m: number | null;
    goal_custom_pace_s_per_km: number | null;
    weekly_km_target_min: number;
    weekly_km_target_max: number;
    zone_bounds: number[];
  } | null,
): {
  profile: ProfileValues;
  profileSaved: boolean;
} {
  if (!row || row.max_hr == null || row.resting_hr == null) {
    return { profile: { ...DEFAULT_PROFILE, zoneBounds: [...DEFAULT_PROFILE.zoneBounds] }, profileSaved: false };
  }
  return {
    profileSaved: true,
    profile: {
      maxHr: row.max_hr,
      restingHr: row.resting_hr,
      goal5kPaceSPerKm: row.goal_5k_pace_s_per_km,
      goal10kPaceSPerKm: row.goal_10k_pace_s_per_km,
      customDistanceKm: row.goal_custom_distance_m == null ? null : Math.round(row.goal_custom_distance_m / 10) / 100,
      customPaceSPerKm: row.goal_custom_pace_s_per_km,
      weeklyKmMin: row.weekly_km_target_min,
      weeklyKmMax: row.weekly_km_target_max,
      zoneBounds: boundsOf(row.zone_bounds) ?? [...DEFAULT_PROFILE.zoneBounds],
    },
  };
}

export async function loadBackfill(sb: SupabaseClient<Database>): Promise<BackfillJob | null> {
  const jobRes = await sb
    .from("import_jobs")
    .select("status, progress, total")
    .eq("kind", "strava_backfill")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (jobRes.error) throw new Error("Could not load the backfill");
  const openRes = await sb.from("sync_queue").select("created_at").in("status", ["queued", "running", "deferred"]);
  if (openRes.error) throw new Error("Could not load the backfill");
  const open = openRes.data ?? [];
  const oldest = open.map((row) => row.created_at).sort()[0];
  let batchDone = 0;
  if (oldest) {
    const doneRes = await sb
      .from("sync_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", oldest);
    if (doneRes.error) throw new Error("Could not load the backfill");
    batchDone = doneRes.count ?? 0;
  }
  if (!jobRes.data && open.length === 0) return null;
  return {
    status: jobRes.data ? asJobStatus(jobRes.data.status) : "running",
    progress: jobRes.data?.progress ?? 0,
    total: jobRes.data?.total ?? null,
    batchDone,
    waiting: open.length,
  };
}

function progressOf(progress: number, total: number | null): { done: number; total: number } | null {
  const max = total != null && total > 0 ? total : progress;
  if (max <= 0) return null;
  return { done: Math.min(progress, max), total: max };
}

export async function loadSettings(sb: SupabaseClient<Database>): Promise<SettingsLoad> {
  const [profileRes, connectionRes, logsRes, backfill, archiveRes] = await Promise.all([
    sb
      .from("profiles")
      .select("user_id, max_hr, resting_hr, goal_5k_pace_s_per_km, goal_10k_pace_s_per_km, goal_custom_distance_m, goal_custom_pace_s_per_km, weekly_km_target_min, weekly_km_target_max, zone_bounds")
      .maybeSingle(),
    sb
      .from("strava_connections")
      .select("athlete_id, webhook_subscription_id, revoked_at, connected_at")
      .maybeSingle(),
    sb
      .from("sync_log")
      .select("id, received_at, source, status, count, error")
      .order("received_at", { ascending: false })
      .limit(20),
    loadBackfill(sb),
    sb
      .from("import_jobs")
      .select("status, progress, total, error")
      .eq("kind", "strava_archive")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileRes.error || connectionRes.error || logsRes.error || archiveRes.error) {
    return { ok: false };
  }

  const logs: SyncLogEntry[] = [];
  for (const row of logsRes.data ?? []) {
    const status = asStatus(row.status);
    if (!status) continue;
    logs.push({
      id: row.id,
      receivedAt: row.received_at,
      source: row.source,
      status,
      count: row.count,
      error: row.error,
    });
  }

  const connection = connectionRes.data
    ? {
        athleteId: connectionRes.data.athlete_id,
        webhookSubscriptionId: connectionRes.data.webhook_subscription_id,
        revokedAt: connectionRes.data.revoked_at,
        connectedAt: connectionRes.data.connected_at,
      }
    : null;

  const archive = archiveRes.data;
  const { profile, profileSaved } = profileFrom(profileRes.data);
  return {
    ok: true,
    profile,
    profileSaved,
    connection,
    logs,
    backfill,
    archiveProgress: archive ? progressOf(archive.progress, archive.total) : null,
    archiveSkipped: archive ? skippedFromJob(archive.error) : [],
  };
}

export async function deleteStravaApiWorkouts(sb: SupabaseClient<Database>, userId: string): Promise<void> {
  await assertAal2(sb);
  const { error } = await sb.from("workouts").delete().eq("user_id", userId).eq("origin", "api");
  if (error) throw new Error("delete_failed");
}
