const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });

export const preflight = (req: Request) =>
  req.method === "OPTIONS" ? new Response(null, { status: 204, headers: cors }) : null;
// Structured log line: ids, counts, durations and reason codes only.
// Never health data, tokens, routes, names or payloads (PRD 9).
export const log = (event: string, fields: Record<string, string | number | boolean>) =>
  console.log(JSON.stringify({ event, ...fields }));
export const isServiceCall = (req: Request) =>
  req.headers.get("authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

export type OAuthState = {
  sign: (payload: string) => Promise<string>;
  verify: (state: string) => Promise<string | null>;
};

// Missing or empty secrets must not become an HMAC key. Callers fail closed before sign.
export function oauthState(secret: string | null | undefined): OAuthState | null {
  if (!secret) return null;
  const enc = new TextEncoder();
  let key: Promise<CryptoKey> | undefined;
  const signingKey = () => {
    key ??= crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return key;
  };
  const b64 = (b: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const sign = async (payload: string) =>
    `${payload}.${b64(await crypto.subtle.sign("HMAC", await signingKey(), enc.encode(payload)))}`;
  const verify = async (state: string) => {
    const payload = state.slice(0, state.lastIndexOf("."));
    return payload && (await sign(payload)) === state ? payload : null;
  };
  return { sign, verify };
}
