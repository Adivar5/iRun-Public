import { sql } from "../_shared/db.ts";
import { isCursor, recomputeBatch } from "../_shared/derive-1b.ts";
import { isServiceCall, json, log } from "../_shared/http.ts";
import { deleteActivity, ingestActivity } from "../_shared/ingest.ts";
import { getValidAccessToken, StravaNotFound, StravaRateLimited, StravaUnauthorized, stravaApi, type StravaApi } from "../_shared/strava.ts";

type Aspect = "create" | "update" | "delete" | "deauthorize";
type SyncJob = {
  id: number | string;
  user_id: string;
  object_id: number | string;
  aspect: string;
  attempts: number | string;
};

function asAspect(value: string): Aspect {
  switch (value) {
    case "create":
    case "update":
    case "delete":
    case "deauthorize":
      return value;
    default:
      throw new Error("fetch_failed");
  }
}

async function closeBackfill(userId: string) {
  await sql`
    update public.import_jobs
    set status = 'done'
    where user_id = ${userId} and kind = 'strava_backfill' and status = 'running'
      and not exists (
        select 1 from public.sync_queue
        where user_id = ${userId} and status in ('queued', 'running', 'deferred')
      )`;
}

async function noteBackfill(userId: string) {
  await sql`
    update public.import_jobs
    set progress = least(progress + 1, coalesce(total, progress + 1))
    where id = (
      select id from public.import_jobs
      where user_id = ${userId} and kind = 'strava_backfill' and status = 'running' and coalesce(total, 0) > 0
      order by created_at asc
      limit 1
    )`;
  await closeBackfill(userId);
}

async function markDone(job: SyncJob) {
  await sql`update public.sync_queue set status = 'done', last_error = null where id = ${job.id}`;
  await sql`insert into public.sync_log (user_id, source, status, count, error)
    values (${job.user_id}, 'strava', 'ok', 1, null)`;
  await noteBackfill(job.user_id);
}

async function finishUnconfirmed(job: SyncJob, reason: "delete_unconfirmed" | "deauth_unconfirmed") {
  log("sync_job", { reason });
  await sql`update public.sync_queue set status = 'done', last_error = ${reason} where id = ${job.id}`;
  await sql`insert into public.sync_log (user_id, source, status, count, error)
    values (${job.user_id}, 'strava', 'skipped', 0, ${reason})`;
}

async function tokenForConfirm(userId: string, api: StravaApi): Promise<string> {
  try {
    return await getValidAccessToken(userId, api);
  } catch (err) {
    if (!(err instanceof StravaUnauthorized)) throw err;
    const [row] = await sql`select access_token from private.get_strava_tokens(${userId})`;
    if (!row?.access_token) throw err;
    return row.access_token as string;
  }
}

async function confirmDelete(job: SyncJob, api: StravaApi) {
  const activityId = Number(job.object_id);
  const token = await tokenForConfirm(job.user_id, api);
  try {
    await api.get(`/activities/${activityId}`, token);
  } catch (err) {
    if (err instanceof StravaNotFound) {
      await deleteActivity(job.user_id, activityId);
      await markDone(job);
      return;
    }
    throw err;
  }
  await finishUnconfirmed(job, "delete_unconfirmed");
}

async function confirmDeauthorize(job: SyncJob, api: StravaApi) {
  const token = await tokenForConfirm(job.user_id, api);
  try {
    await api.get("/athlete", token);
  } catch (err) {
    if (err instanceof StravaUnauthorized) {
      await sql`select private.delete_strava_tokens(${job.user_id})`;
      await sql`insert into public.sync_log (user_id, source, status, count, error)
        values (${job.user_id}, 'strava', 'ok', 0, null)`;
      await markDone(job);
      return;
    }
    throw err;
  }
  await finishUnconfirmed(job, "deauth_unconfirmed");
}

async function processJob(job: SyncJob, api: StravaApi): Promise<boolean> {
  const aspect = asAspect(job.aspect);
  switch (aspect) {
    case "create":
    case "update": {
      const { readShort } = await ingestActivity(job.user_id, Number(job.object_id), api);
      await markDone(job);
      return readShort >= 90;
    }
    case "delete":
      await confirmDelete(job, api);
      return false;
    case "deauthorize":
      await confirmDeauthorize(job, api);
      return false;
    default: {
      const unexpected: never = aspect;
      return unexpected;
    }
  }
}

async function handleJobError(job: SyncJob, err: unknown): Promise<boolean> {
  if (err instanceof StravaRateLimited) {
    log("sync_job", { reason: "rate_limited" });
    await sql`update public.sync_queue set status = 'deferred', last_error = 'rate_limited',
      not_before = date_trunc('hour', now()) + ((floor(extract(minute from now()) / 15)::int + 1) * interval '15 minutes')
      where id = ${job.id}`;
    await sql`insert into public.sync_log (user_id, source, status, count, error)
      values (${job.user_id}, 'strava', 'error', 0, 'rate_limited')`;
    return true;
  }
  if (err instanceof StravaUnauthorized) {
    log("sync_job", { reason: "token_invalid" });
    await sql`update public.sync_queue set status = 'failed', last_error = 'token_invalid' where id = ${job.id}`;
    await sql`insert into public.sync_log (user_id, source, status, count, error)
      values (${job.user_id}, 'strava', 'error', 0, 'token_invalid')`;
    await closeBackfill(job.user_id);
    return false;
  }
  if (err instanceof StravaNotFound) {
    await deleteActivity(job.user_id, Number(job.object_id));
    await markDone(job);
    return false;
  }
  log("sync_job", { reason: "fetch_failed" });
  const attempts = Number(job.attempts);
  if (attempts >= 3) {
    await sql`update public.sync_queue set status = 'failed', last_error = 'fetch_failed' where id = ${job.id}`;
    await sql`insert into public.sync_log (user_id, source, status, count, error)
      values (${job.user_id}, 'strava', 'error', 0, 'fetch_failed')`;
    await closeBackfill(job.user_id);
    return false;
  }
  await sql`update public.sync_queue set status = 'queued', last_error = 'fetch_failed',
    not_before = now() + (${attempts * 2} * interval '1 minute') where id = ${job.id}`;
  return false;
}

async function releaseUnprocessed(jobs: SyncJob[], from: number) {
  const ids = jobs.slice(from).map((job) => job.id);
  if (!ids.length) return;
  await sql`update public.sync_queue set status = 'queued', attempts = greatest(attempts - 1, 0)
    where id in ${sql(ids)} and status = 'running'`;
}

function isRecompute(body: unknown): body is { recompute: true; after?: unknown } {
  return !!body && typeof body === "object" && (body as { recompute?: unknown }).recompute === true;
}

// Job posts have no JSON body. A recompute post is the only caller that sends application/json.
async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function handleWorker(req: Request, api: StravaApi = stravaApi()): Promise<Response> {
  if (!isServiceCall(req)) return new Response(null, { status: 401 });
  const body = await readJson(req);
  if (isRecompute(body)) {
    const after = body.after ?? null;
    if (after != null && !isCursor(after)) return json({ error: "bad_cursor" }, 400);
    const result = await recomputeBatch(isCursor(after) ? after : null);
    return json(result);
  }
  const jobs = await sql<SyncJob[]>`select * from private.claim_sync_jobs(10)`;
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    let stop = false;
    try {
      stop = await processJob(job, api);
    } catch (err) {
      stop = await handleJobError(job, err);
    }
    if (stop) {
      await releaseUnprocessed(jobs, i + 1);
      break;
    }
  }
  return new Response(null, { status: 200 });
}

if (import.meta.main || "EdgeRuntime" in globalThis) Deno.serve((req) => handleWorker(req));
