import { sql } from "./db.ts";
import { getValidAccessToken, stravaApi, type StravaApi } from "./strava.ts";

type ActivityPage = { id: number };

const PER_PAGE = 100;

// Lists activity ids into sync_queue. Per-activity fetches stay in the worker so this stays inside Strava's read budget.
export async function enqueueRange(
  userId: string,
  opts: { after: number; before?: number; eventTime: number },
  api: StravaApi = stravaApi(),
): Promise<{ queued: number }> {
  const token = await getValidAccessToken(userId, api);
  let queued = 0;
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      after: String(opts.after),
      per_page: String(PER_PAGE),
      page: String(page),
    });
    if (opts.before != null) query.set("before", String(opts.before));
    const { data } = await api.get<ActivityPage[]>(`/athlete/activities?${query}`, token);
    if (data.length === 0) break;
    const seen = new Set<number>();
    const rows = [];
    for (const activity of data) {
      if (seen.has(activity.id)) continue;
      seen.add(activity.id);
      rows.push({
        user_id: userId,
        object_type: "activity",
        object_id: activity.id,
        aspect: "create",
        event_time: opts.eventTime,
      });
    }
    const inserted = await sql`
      insert into public.sync_queue ${sql(rows, "user_id", "object_type", "object_id", "aspect", "event_time")}
      on conflict (object_id, aspect, event_time) do nothing
    `;
    queued += inserted.count;
    if (data.length < PER_PAGE) break;
  }
  return { queued };
}
