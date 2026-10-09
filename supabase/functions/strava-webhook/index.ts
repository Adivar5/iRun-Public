import { sql } from "../_shared/db.ts";
import { log } from "../_shared/http.ts";
import { handleWebhook } from "./handler.ts";
Deno.serve(async (req) => {
  const t0 = Date.now();
  const res = await handleWebhook(req, {
    verifyToken: Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN")!,
    ownerByAthlete: async (id) =>
      (await sql`select user_id from public.strava_connections where athlete_id = ${id} and revoked_at is null`)[0]?.user_id ?? null,
    enqueue: async (e) => {
      await sql`insert into public.sync_queue (user_id, object_type, object_id, aspect, event_time)
                values (${e.userId}, ${e.objectType}, ${e.objectId}, ${e.aspect}, ${e.eventTime}) on conflict do nothing`;
    },
  });
  log("webhook", { status: res.status, ms: Date.now() - t0 });
  return res;
});
