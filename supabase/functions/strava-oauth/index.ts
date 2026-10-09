// POST ?action=start       (user JWT, AAL2)  -> { url } of Strava authorize, state = HMAC-signed userId:timestamp
// GET  ?code=&state=&scope=                  -> exchange, check scope, store tokens, 302 to APP_ORIGIN/settings?strava=connected
// POST ?action=disconnect  (user JWT, AAL2)  -> revoke at Strava, delete Vault secrets, mark revoked
import { admin, sql } from "../_shared/db.ts";
import { json, log, oauthState, preflight } from "../_shared/http.ts";
import { disconnectStrava, stravaApi } from "../_shared/strava.ts";

const APP = Deno.env.get("APP_ORIGIN")!;
// ponytail: local edge runtime sets SUPABASE_URL to http://kong:8000, which Strava cannot redirect to.
// Published API port is 54321 in config.toml. Hosted SUPABASE_URL is already public.
const base = Deno.env.get("SUPABASE_URL")?.includes("://kong") ? "http://127.0.0.1:54321" : Deno.env.get("SUPABASE_URL");
const SELF = `${base}/functions/v1/strava-oauth`;
const states = oauthState(Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN"));

const ownerFrom = async (req: Request) => {
  const jwt = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  const claims = JSON.parse(atob(jwt.split(".")[1]!.replaceAll("-", "+").replaceAll("_", "/")));
  return data.user && claims.aal === "aal2" ? data.user : null;
};

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (req.method === "POST" && action === "start") {
    const user = await ownerFrom(req);
    if (!user) return json({ error: "sign_in_required" }, 401);
    if (!states) return json({ error: "unavailable" }, 503);
    const auth = new URL("https://www.strava.com/oauth/authorize");
    auth.search = new URLSearchParams({ client_id: Deno.env.get("STRAVA_CLIENT_ID")!, response_type: "code", redirect_uri: SELF,
      approval_prompt: "auto", scope: "activity:read_all", state: await states.sign(`${user.id}:${Date.now()}`) }).toString();
    return json({ url: auth.toString() });
  }
  if (req.method === "POST" && action === "disconnect") {
    const user = await ownerFrom(req);
    if (!user) return json({ error: "sign_in_required" }, 401);
    const [t] = await sql`select access_token from private.get_strava_tokens(${user.id})`;
    await disconnectStrava({
      accessToken: t ? t.access_token : null,
      deleteTokens: async () => { await sql`select private.delete_strava_tokens(${user.id})`; },
      log,
    });
    return json({ ok: true });
  }
  if (req.method !== "GET") return new Response(null, { status: 405 });
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const payload = state && states ? await states.verify(state) : null;
  const [userId, ts] = payload ? payload.split(":") : [];
  if (!code || !userId || Date.now() - Number(ts) > 10 * 60_000) return Response.redirect(`${APP}/settings?strava=error`, 302);
  if (!(url.searchParams.get("scope") ?? "").split(",").includes("activity:read_all")) return Response.redirect(`${APP}/settings?strava=scope`, 302);
  try {
    const t = await stravaApi().exchangeCode(code);
    await sql.begin(async (tx) => {
      await tx`insert into public.strava_connections (user_id, athlete_id, scopes) values (${userId}, ${t.athlete.id}, 'activity:read_all')
               on conflict (user_id) do update set athlete_id = excluded.athlete_id, revoked_at = null, connected_at = now()`;
      await tx`select private.set_strava_tokens(${userId}, ${t.access_token}, ${t.refresh_token}, to_timestamp(${t.expires_at}))`;
    });
  } catch {
    log("strava_connect_failed", { reason: "store_failed" });
    return Response.redirect(`${APP}/settings?strava=error`, 302);
  }
  log("strava_connected", { ok: true });
  return Response.redirect(`${APP}/settings?strava=connected`, 302);
});
