// built to spec
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { SyncPillProps } from "@/components/ui/sync-pill";

export function syncStateFrom(lastOkAt: string | null, lastError: string | null): SyncPillProps {
  return {
    state: lastError ? "failed" : "ok",
    lastSyncAt: lastOkAt,
  };
}

export async function getSyncState(sb: SupabaseClient<Database>): Promise<SyncPillProps> {
  const { data, error } = await sb
    .from("sync_log")
    .select("received_at, status, error")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load sync state");
  if (!data) return syncStateFrom(null, null);
  if (data.status === "error") return syncStateFrom(data.received_at, data.error ?? "sync_failed");
  return syncStateFrom(data.received_at, null);
}
