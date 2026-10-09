import { sql } from "./db.ts";
import { derive1b, rederiveUser } from "./derive-1b.ts";
import { log } from "./http.ts";
import { cleanStream, computeSplits, efficiencyIndex, hrLoad, weekStartLocal, weeklySummaries, zoneSeconds, type RunKind, type Stream, type WorkoutLite, type ZoneSeconds } from "./metrics/index.ts";
import { normalizeActivity, normalizeStrengthSets, strengthIsLegDay, toStream, type StravaActivity, type StravaStreams, type StrengthSetIn, type StrengthSetRow } from "./normalize.ts";
import { getValidAccessToken, StravaRateLimited, StravaUnauthorized, stravaApi, type StravaApi } from "./strava.ts";

const KEYS = "time,distance,heartrate,latlng,altitude,velocity_smooth,cadence,moving";

function readExerciseSets(payload: unknown): StrengthSetIn[] | undefined {
  if (Array.isArray(payload)) return payload as StrengthSetIn[];
  if (!payload || typeof payload !== "object" || !("exercise_sets" in payload)) return undefined;
  const sets = (payload as { exercise_sets?: unknown }).exercise_sets;
  return Array.isArray(sets) ? sets as StrengthSetIn[] : [];
}

// The public sets read has no documented GET. A miss is an empty log, not a failed session.
export async function fetchStrengthSets(
  api: StravaApi,
  activityId: number,
  token: string,
  activity?: unknown,
): Promise<{ sets: StrengthSetIn[]; readShort: number | null }> {
  const embedded = readExerciseSets(activity);
  if (embedded) return { sets: embedded, readShort: null };
  try {
    const { data, usage } = await api.get<unknown>(`/activities/${activityId}/sets`, token);
    return { sets: readExerciseSets(data) ?? [], readShort: usage.readShort };
  } catch (err) {
    if (err instanceof StravaRateLimited || err instanceof StravaUnauthorized) throw err;
    log("sync_job", { reason: "sets_unavailable" });
    return { sets: [], readShort: null };
  }
}

export async function ingestActivity(userId: string, activityId: number, api: StravaApi = stravaApi()) {
  const token = await getValidAccessToken(userId, api);
  const { data: activity, usage } = await api.get<StravaActivity>(`/activities/${activityId}`, token);
  const { type, runKind, row, name } = normalizeActivity(activity);
  let stream: Stream | null = null;
  let readShort = usage.readShort;
  let setRows: StrengthSetRow[] = [];
  if (type === "run") {
    const streams = await api.get<StravaStreams>(`/activities/${activityId}/streams?keys=${KEYS}&key_by_type=true`, token);
    stream = cleanStream(toStream(streams.data));
    readShort = streams.usage.readShort;
  }
  if (type === "strength") {
    const sets = await fetchStrengthSets(api, activityId, token, activity);
    setRows = normalizeStrengthSets(sets.sets);
    if (sets.readShort != null) readShort = sets.readShort;
  }
  const [profile] = await sql`select max_hr, resting_hr, zone_bounds from public.profiles where user_id = ${userId}`;
  const bounds = Array.isArray(profile?.zone_bounds) && profile.zone_bounds.length === 4
    ? profile.zone_bounds.map(Number) as [number, number, number, number]
    : undefined;
  const zones = stream && profile?.max_hr != null && bounds ? zoneSeconds(stream, Number(profile.max_hr), bounds) : null;
  const load = stream && profile?.max_hr != null && profile?.resting_hr != null
    ? hrLoad(stream, Number(profile.resting_hr), Number(profile.max_hr))
    : null;
  const efficiency = efficiencyIndex({ distanceM: row.distance_m, movingS: row.moving_s, avgHr: row.avg_hr, runKind });
  const hasRoute = !!stream?.lat?.some((point) => point != null);
  const legDay = type === "strength" && strengthIsLegDay(setRows);

  const workoutId = await sql.begin(async (tx) => {
    const [workout] = await tx`
      insert into public.workouts ${tx({
        ...row,
        user_id: userId,
        origin: "api",
        name,
        run_kind: runKind,
        load,
        efficiency,
        zone_seconds: zones,
        has_route: hasRoute,
        is_leg_day: legDay,
        leg_day_source: "strava",
      })}
      on conflict (user_id, source, source_id) do update set
        origin = 'api', type = excluded.type, start_at = excluded.start_at, duration_s = excluded.duration_s,
        moving_s = excluded.moving_s, distance_m = excluded.distance_m, energy_kcal = excluded.energy_kcal,
        avg_hr = excluded.avg_hr, max_hr = excluded.max_hr, elevation_gain_m = excluded.elevation_gain_m,
        has_hr = excluded.has_hr, has_route = excluded.has_route, load = excluded.load,
        efficiency = excluded.efficiency, zone_seconds = excluded.zone_seconds, updated_at = now(),
        run_kind = case
          when public.workouts.run_kind is null then excluded.run_kind
          when public.workouts.run_kind = 'easy' and excluded.run_kind is distinct from 'easy' then excluded.run_kind
          else public.workouts.run_kind
        end,
        name = coalesce(excluded.name, public.workouts.name),
        is_leg_day = case when public.workouts.leg_day_source = 'user' then public.workouts.is_leg_day else excluded.is_leg_day end
      returning id`;
    if (stream) {
      await tx`
        insert into public.workout_samples ${tx({
          workout_id: workout.id,
          user_id: userId,
          t: stream.t,
          d: stream.d,
          hr: stream.hr,
          v: stream.v,
          alt: stream.alt,
          lat: stream.lat,
          lon: stream.lon,
          moving: stream.moving ? tx.array(stream.moving) : null,
        })}
        on conflict (workout_id) do update set t = excluded.t, d = excluded.d, hr = excluded.hr, v = excluded.v,
          alt = excluded.alt, lat = excluded.lat, lon = excluded.lon, moving = excluded.moving`;
      await tx`delete from public.splits where workout_id = ${workout.id}`;
      const splits = computeSplits(stream);
      if (splits.length) {
        await tx`insert into public.splits ${tx(splits.map((split) => ({
          workout_id: workout.id,
          user_id: userId,
          km_index: split.kmIndex,
          pace_s_per_km: split.paceSPerKm,
          avg_hr: split.avgHr,
        })))}`;
      }
    }
    if (type === "strength") {
      await tx`delete from public.strength_sets where workout_id = ${workout.id}`;
      if (setRows.length) {
        await tx`insert into public.strength_sets ${tx(setRows.map((set) => ({
          workout_id: workout.id,
          user_id: userId,
          set_index: set.set_index,
          exercise_name: set.exercise_name,
          muscle_groups: set.muscle_groups,
          weight_kg: set.weight_kg,
          weight_unit_raw: set.weight_unit_raw,
          reps: set.reps,
          reps_unit_raw: set.reps_unit_raw,
        })))}`;
      }
    }
    return workout.id as string;
  });
  if (type === "run") await derive1b(userId, workoutId);
  await recomputeWeeks(userId, [weekStartLocal(row.start_at)]);
  return { readShort };
}

export async function deleteActivity(userId: string, activityId: number) {
  const [workout] = await sql`delete from public.workouts where user_id = ${userId} and source = 'strava' and source_id = ${String(activityId)} returning start_at`;
  if (!workout) return;
  await recomputeWeeks(userId, [weekStartLocal(new Date(workout.start_at).toISOString())]);
  await rederiveUser(userId);
}

export async function recomputeWeeks(userId: string, weekStarts: string[]) {
  for (const weekStart of [...new Set(weekStarts)]) {
    const rows = await sql`select start_at, type, distance_m, duration_s, moving_s, avg_hr, run_kind, load, efficiency, zone_seconds
      from public.workouts where user_id = ${userId}
      and start_at >= (${weekStart}::date - interval '1 day') and start_at < (${weekStart}::date + interval '8 days')`;
    const lite: WorkoutLite[] = rows.map((row) => ({
      startAt: new Date(row.start_at).toISOString(),
      type: row.type,
      distanceM: row.distance_m,
      durationS: row.duration_s,
      movingS: row.moving_s,
      avgHr: row.avg_hr,
      runKind: row.run_kind as RunKind | null,
      load: row.load,
      efficiency: row.efficiency,
      zoneSeconds: row.zone_seconds as ZoneSeconds | null,
    }));
    const summary = weeklySummaries(lite).find((item) => item.weekStart === weekStart)
      ?? { weekStart, km: 0, runCount: 0, durationS: 0, load: null, longRunKm: 0, avgEfficiency: null, zoneSeconds: [0, 0, 0, 0, 0] as ZoneSeconds };
    await sql`insert into public.weekly_summaries (user_id, week_start, km, run_count, duration_s, load, long_run_km, avg_efficiency, zone_seconds)
      values (${userId}, ${weekStart}, ${summary.km}, ${summary.runCount}, ${summary.durationS}, ${summary.load}, ${summary.longRunKm}, ${summary.avgEfficiency}, ${summary.zoneSeconds})
      on conflict (user_id, week_start) do update set km = excluded.km, run_count = excluded.run_count, duration_s = excluded.duration_s,
        load = excluded.load, long_run_km = excluded.long_run_km, avg_efficiency = excluded.avg_efficiency, zone_seconds = excluded.zone_seconds`;
  }
}
