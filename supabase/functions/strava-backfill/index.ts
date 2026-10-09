// POST (user JWT, AAL2) -> queue a full history or the last 7 days ("Re-sync now") and return { queued }.
import { admin, sql } from "../_shared/db.ts";
import { enqueueRange } from "../_shared/enqueue.ts";
import { json, log, preflight } from "../_shared/http.ts";
import { StravaUnauthorized } from "../_shared/strava.ts";

const DAY = 86_400;

function nudgeWorker(): void {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const base = Deno.env.get("SUPABASE_URL");
  if (!key || !base) return;
  const origin = base.includes("://kong") ? "http://127.0.0.1:54321" : base;
  const task = fetch(`${origin}/functions/v1/strava-worker`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
  }).then(() => undefined, () => undefined);
  const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (edge) edge.waitUntil(task);
  else void task;
}

const ownerFrom = async (req: Request) => {
  const jwt = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  const part = jwt.split(".")[1];
  if (!part) return null;
  const claims = JSON.parse(atob(part.replaceAll("-", "+").replaceAll("_", "/"))) as { aal?: string };
  return data.user && claims.aal === "aal2" ? data.user : null;
};

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const user = await ownerFrom(req);
  if (!user) return json({ error: "sign_in_required" }, 401);
  const text = await req.text();
  let days: number | undefined;
  if (text.trim()) {
    try {
      const body = JSON.parse(text) as { days?: unknown };
      if (body.days !== undefined && body.days !== 7) return json({ error: "bad_request" }, 400);
      if (body.days === 7) days = 7;
    } catch {
      return json({ error: "bad_request" }, 400);
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const range = days === 7
    ? { after: now - 7 * DAY, eventTime: Math.floor(now / DAY) }
    : { after: 0, eventTime: 0 };
  const [job] = await sql`insert into public.import_jobs (user_id, kind) values (${user.id}, 'strava_backfill') returning id`;
  if (!job) return json({ error: "job_failed" }, 500);
  try {
    const { queued } = await enqueueRange(user.id, range);
    await sql`update public.import_jobs set total = ${queued}, status = ${queued === 0 ? "done" : "running"} where id = ${job.id}`;
    if (queued > 0) nudgeWorker();
    log("backfill", { queued });
    return json({ queued });
  } catch (error) {
    const reason = error instanceof StravaUnauthorized ? "token_invalid" : "enqueue_failed";
    await sql`update public.import_jobs set status = 'failed', error = ${sql.json({ reason })} where id = ${job.id}`;
    log("backfill_failed", { reason });
    return json({ error: reason }, 502);
  }
});
