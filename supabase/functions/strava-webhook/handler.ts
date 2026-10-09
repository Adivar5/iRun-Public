import { z } from "npm:zod@3";
export type QueueEvent = { userId: string; objectType: "activity" | "athlete"; objectId: number; aspect: "create" | "update" | "delete" | "deauthorize"; eventTime: number };
const MAX_BYTES = 4096;
const Event = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number().int().positive(),
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: z.number().int().positive(),
  subscription_id: z.number().int(),
  event_time: z.number().int(),
  updates: z.record(z.string(), z.string()).optional(),
}).strict();

export async function handleWebhook(req: Request, deps: { verifyToken: string; ownerByAthlete(id: number): Promise<string | null>; enqueue(e: QueueEvent): Promise<void> }) {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") !== "subscribe" || url.searchParams.get("hub.verify_token") !== deps.verifyToken) return new Response(null, { status: 403 });
    return Response.json({ "hub.challenge": url.searchParams.get("hub.challenge") });
  }
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const parsed = Event.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  const e = parsed.data;
  const userId = await deps.ownerByAthlete(e.owner_id);
  if (!userId) return new Response(null, { status: 403 });
  const deauth = e.object_type === "athlete" && e.updates?.authorized === "false";
  await deps.enqueue({ userId, objectType: e.object_type, objectId: e.object_id, aspect: deauth ? "deauthorize" : e.aspect_type, eventTime: e.event_time });
  return new Response(null, { status: 200 });
}
