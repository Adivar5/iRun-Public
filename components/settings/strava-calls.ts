type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

function endpoint(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("missing_supabase_url");
  return `${base}/functions/v1/${path}`;
}

function authHeaders(jwt: string, json = false): HeadersInit {
  return json
    ? { authorization: `Bearer ${jwt}`, "content-type": "application/json" }
    : { authorization: `Bearer ${jwt}` };
}

export async function connectStrava(jwt: string, fetchImpl: FetchImpl = fetch): Promise<string> {
  const res = await fetchImpl(endpoint("strava-oauth?action=start"), {
    method: "POST",
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error("connect_failed");
  const body = (await res.json()) as { url?: unknown };
  if (typeof body.url !== "string" || !body.url) throw new Error("connect_failed");
  return body.url;
}

export async function disconnectStrava(jwt: string, fetchImpl: FetchImpl = fetch): Promise<void> {
  const res = await fetchImpl(endpoint("strava-oauth?action=disconnect"), {
    method: "POST",
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error("disconnect_failed");
}

export async function resyncRecent(jwt: string, fetchImpl: FetchImpl = fetch): Promise<void> {
  const res = await fetchImpl(endpoint("strava-backfill"), {
    method: "POST",
    headers: authHeaders(jwt, true),
    body: JSON.stringify({ days: 7 }),
  });
  if (!res.ok) throw new Error("resync_failed");
}

export async function sessionJwt(sb: {
  auth: { getSession(): Promise<{ data: { session: { access_token: string } | null } }> };
}): Promise<string> {
  const { data } = await sb.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error("sign_in_required");
  return jwt;
}
