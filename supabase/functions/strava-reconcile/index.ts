// POST (service key only) -> re-queue the last 7 days for every live connection, once per UTC day.
import { sql } from "../_shared/db.ts";
import { enqueueRange } from "../_shared/enqueue.ts";
import { isServiceCall, json, log } from "../_shared/http.ts";

const DAY = 86_400;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!isServiceCall(req)) return json({ error: "forbidden" }, 401);
  const connections = await sql<{ user_id: string }[]>`select user_id from public.strava_connections where revoked_at is null`;
  const now = Math.floor(Date.now() / 1000);
  const range = { after: now - 7 * DAY, eventTime: Math.floor(now / DAY) };
  let queued = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      const result = await enqueueRange(connection.user_id, range);
      queued += result.queued;
    } catch {
      failed++;
    }
  }
  log("reconcile", { queued, users: connections.length, failed });
  return json({ queued, failed });
});
