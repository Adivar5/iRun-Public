/**
 * Owner step, once, after strava-webhook is deployed.
 * Reads STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN,
 * and STRAVA_WEBHOOK_CALLBACK_URL from the shell. Prints the subscription id.
 * Does not write the database.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in the shell before running this script.`);
  return value;
}

function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length > 0) out = out.replaceAll(secret, "[redacted]");
  }
  return out;
}

function subscriptionId(parsed: unknown): number | null {
  if (parsed === null || typeof parsed !== "object" || !("id" in parsed)) return null;
  const id = parsed.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function main(): Promise<void> {
  const clientId = required("STRAVA_CLIENT_ID");
  const clientSecret = required("STRAVA_CLIENT_SECRET");
  const verifyToken = required("STRAVA_WEBHOOK_VERIFY_TOKEN");
  const callbackUrl = required("STRAVA_WEBHOOK_CALLBACK_URL");
  const secrets = [clientId, clientSecret, verifyToken];

  const form = new FormData();
  form.append("client_id", clientId);
  form.append("client_secret", clientSecret);
  form.append("callback_url", callbackUrl);
  form.append("verify_token", verifyToken);

  const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", { method: "POST", body: form });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Strava push subscription failed (${res.status}): ${redact(text, secrets)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Strava returned a non-JSON subscription response.");
  }
  const id = subscriptionId(parsed);
  if (id === null) throw new Error("Strava response did not include a subscription id.");

  console.log(`callback: ${callbackUrl}`);
  console.log(`subscription id: ${id}`);
  console.log("");
  console.log("Run this in the Supabase SQL editor:");
  console.log(`update public.strava_connections set webhook_subscription_id = ${id};`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "subscribe-webhook failed");
  process.exit(1);
});
