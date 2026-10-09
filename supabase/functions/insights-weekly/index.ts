import { admin, sql } from "../_shared/db.ts";
import { isServiceCall, json, log } from "../_shared/http.ts";
import { runInsightsJob, type Claude } from "../_shared/insights/job.ts";

const ownerFrom = async (req: Request) => {
  const jwt = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  const part = jwt.split(".")[1];
  if (!part) return null;
  const claims = JSON.parse(atob(part.replaceAll("-", "+").replaceAll("_", "/"))) as { aal?: string };
  return data.user && claims.aal === "aal2" ? data.user : null;
};

const claude: Claude = async ({ system, user }) => {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("missing_key");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("INSIGHTS_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("claude_failed");
  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content?.find((block) => block.type === "text")?.text ?? "";
  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const started = Date.now();
  try {
    if (isServiceCall(req)) {
      const [owner] = await sql<{ user_id: string }[]>`select user_id from public.profiles order by created_at limit 1`;
      if (!owner) return json({ error: "no_owner" }, 404);
      return json(await runInsightsJob(owner.user_id, { trigger: "cron", claude }));
    }
    const user = await ownerFrom(req);
    if (!user) return json({ error: "sign_in_required" }, 401);
    return json(await runInsightsJob(user.id, { trigger: "manual", claude }));
  } catch {
    log("insights", { status: "claude_failed", duration_ms: Date.now() - started });
    return json({ error: "insights_failed" }, 502);
  }
});
