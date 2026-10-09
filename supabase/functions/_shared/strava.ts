import { sql } from "./db.ts";
export type TokenSet = { access_token: string; refresh_token: string; expires_at: number };
export type RateUsage = { short: number; daily: number; readShort: number; readDaily: number };
export class StravaRateLimited extends Error {}
export class StravaUnauthorized extends Error {}
export class StravaNotFound extends Error {}
const BASE = "https://www.strava.com";

const pair = (h: string | null) => (h ?? "0,0").split(",").map(Number) as [number, number];
const parseUsage = (h: Headers): RateUsage => {
  const [short, daily] = pair(h.get("x-ratelimit-usage"));
  const [readShort, readDaily] = pair(h.get("x-readratelimit-usage"));
  return { short, daily, readShort, readDaily };
};

export function stravaApi(f: typeof fetch = fetch) {
  const token = async (body: Record<string, string>) => {
    const r = await f(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("STRAVA_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET") ?? "",
        ...body,
      }).toString(),
    });
    if (r.status === 400 || r.status === 401) throw new StravaUnauthorized(`token_${r.status}`);
    if (!r.ok) throw new Error(`token_${r.status}`);
    return r.json();
  };
  return {
    exchangeCode: (code: string) => token({ code, grant_type: "authorization_code" }) as Promise<TokenSet & { athlete: { id: number } }>,
    refresh: (refresh_token: string) => token({ refresh_token, grant_type: "refresh_token" }) as Promise<TokenSet>,
    async get<T>(path: string, accessToken: string) {
      const r = await f(`${BASE}/api/v3${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.status === 429) throw new StravaRateLimited("rate_limited");
      if (r.status === 401) throw new StravaUnauthorized("token_invalid");
      if (r.status === 404) throw new StravaNotFound("not_found");
      if (!r.ok) throw new Error(`strava_${r.status}`);
      return { data: (await r.json()) as T, usage: parseUsage(r.headers) };
    },
  };
}
export type StravaApi = ReturnType<typeof stravaApi>;

// Strava's revoke endpoint (recommended as of 2026-06-01). Local tokens are always deleted.
// A non-2xx response or a thrown fetch is not logged as success.
export async function disconnectStrava(input: {
  accessToken: string | null;
  deleteTokens: () => Promise<void>;
  log: (event: string, fields: Record<string, string | number | boolean>) => void;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  let reason: string | null = null;
  if (input.accessToken) {
    try {
      const id = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
      const secret = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";
      const r = await (input.fetchImpl ?? fetch)(`${BASE}/oauth/revoke`, {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${id}:${secret}`)}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: input.accessToken }).toString(),
      });
      if (!r.ok) reason = "revoke_rejected";
    } catch {
      reason = "revoke_failed";
    }
  }
  await input.deleteTokens();
  if (reason) input.log("strava_disconnected", { reason });
  else input.log("strava_disconnected", { ok: true });
}

// Serialized refresh (PRD 4.1, 13): row lock on strava_connections, Strava call inside the transaction,
// rotated refresh token saved before commit. A concurrent caller blocks on the lock, then sees the fresh token.
export async function getValidAccessToken(userId: string, api: StravaApi = stravaApi()): Promise<string> {
  return await sql.begin(async (tx) => {
    const [c] = await tx`select 1 from public.strava_connections where user_id = ${userId} and revoked_at is null for update`;
    if (!c) throw new StravaUnauthorized("no_connection");
    const [t] = await tx`select access_token, refresh_token, expires_at from private.get_strava_tokens(${userId})`;
    if (!t) throw new StravaUnauthorized("no_tokens");
    if (new Date(t.expires_at).getTime() - Date.now() > 5 * 60_000) return t.access_token as string;
    const fresh = await api.refresh(t.refresh_token);
    await tx`select private.set_strava_tokens(${userId}, ${fresh.access_token}, ${fresh.refresh_token}, to_timestamp(${fresh.expires_at}))`;
    return fresh.access_token;
  });
}
