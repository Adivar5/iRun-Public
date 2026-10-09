import { sql } from "./db.ts";
import {
  bestEffort,
  clusterLoops,
  closureM,
  EFFORT_DISTANCES,
  equivalentEfforts,
  haversineM,
  signature,
  type Signature,
} from "./metrics/index.ts";

export const RECOMPUTE_BATCH = 25;

type EffortKind = "exact" | "equivalent" | "whole_run";
type EffortRow = {
  distance_label: string;
  kind: EffortKind;
  distance_m: number;
  elapsed_s: number;
  start_offset_s: number | null;
};

type RunSamples = { id: string; distance_m: number; lat: (number | null)[] | null; lon: (number | null)[] | null };
type OldLoop = { id: string; name: string; typical_distance_m: number; members: string[] };

export const defaultLoopName = (distanceM: number) => `Loop ${(distanceM / 1000).toFixed(1)} km`;

// Pure: every distance the run covers, the Riegel equivalents and one whole-run row.
export function effortRows(
  stream: { t: number[]; d: number[] },
  w: { distanceM: number; durationS: number; movingS: number | null },
): EffortRow[] {
  const full = { ...stream, hr: null, v: null, alt: null, lat: null, lon: null, moving: null };
  const exact = EFFORT_DISTANCES.flatMap(({ label, m }) => {
    const effort = bestEffort(full, m);
    return effort
      ? [{ distance_label: label, kind: "exact" as const, distance_m: m, elapsed_s: effort.elapsedS, start_offset_s: effort.startOffsetS }]
      : [];
  });
  const movingS = w.movingS ?? w.durationS;
  const equivalent = equivalentEfforts({ distanceM: w.distanceM, elapsedS: w.durationS, movingS }).map((e) => ({
    distance_label: e.label,
    kind: "equivalent" as const,
    distance_m: EFFORT_DISTANCES.find((x) => x.label === e.label)!.m,
    elapsed_s: e.elapsedS,
    start_offset_s: null,
  }));
  const whole = w.distanceM > 0 && movingS > 0
    ? [{ distance_label: "whole", kind: "whole_run" as const, distance_m: w.distanceM, elapsed_s: movingS, start_offset_s: null }]
    : [];
  return [...exact, ...equivalent, ...whole];
}

// A reserved transaction is not the pool Sql (no CLOSE/END). Both are tagged-template callers.
type Db = (strings: TemplateStringsArray, ...values: readonly string[]) => Promise<unknown>;

// is_pb on an exact row means it beat every exact effort of that label from earlier runs. Any upsert of an older
// run can flip later rows, so this re-derives the flag for the whole user in one pass. Other kinds are never PBs.
async function refreshPbs(db: Db, userId: string) {
  await db`
    with ranked as (
      select be.workout_id, be.distance_label,
        be.elapsed_s < coalesce(min(be.elapsed_s) over (
          partition by be.distance_label order by w.start_at, be.workout_id
          rows between unbounded preceding and 1 preceding), 'Infinity'::real) as pb
      from public.best_efforts be
      join public.workouts w on w.id = be.workout_id
      where be.user_id = ${userId} and be.kind = 'exact')
    update public.best_efforts be set is_pb = ranked.pb
    from ranked
    where be.workout_id = ranked.workout_id and be.distance_label = ranked.distance_label and be.kind = 'exact'
      and be.is_pb is distinct from ranked.pb`;
}

// Stored samples only, never Strava. A missing row or a non-run is skipped.
// A run whose distance stream has fewer than two points drops its efforts; otherwise a stale exact row stays in the PB chain.
export async function deriveEfforts(userId: string, workoutId: string): Promise<void> {
  const [row] = await sql`
    select w.type, w.distance_m, w.duration_s, w.moving_s, s.t, s.d
    from public.workouts w join public.workout_samples s on s.workout_id = w.id
    where w.id = ${workoutId} and w.user_id = ${userId}`;
  if (!row || row.type !== "run") return;
  if (!Array.isArray(row.d) || row.d.length < 2) {
    await sql.begin(async (tx) => {
      await tx`delete from public.best_efforts where workout_id = ${workoutId}`;
      await refreshPbs(tx, userId);
    });
    return;
  }
  const rows = effortRows(
    { t: (row.t as number[]).map(Number), d: (row.d as number[]).map(Number) },
    { distanceM: Number(row.distance_m), durationS: Number(row.duration_s), movingS: row.moving_s == null ? null : Number(row.moving_s) },
  );
  await sql.begin(async (tx) => {
    await tx`delete from public.best_efforts where workout_id = ${workoutId}`;
    if (rows.length) {
      await tx`insert into public.best_efforts ${tx(rows.map((r) => ({ ...r, workout_id: workoutId, user_id: userId })))}`;
    }
    await refreshPbs(tx, userId);
  });
}

// Mean-free overlap: the smaller of the two directional shares of points within the match radius.
function similarity(a: Signature, b: Signature, radiusM = 60): number {
  const share = (from: Signature, to: Signature) => {
    let hit = 0;
    for (let i = 0; i < from.lat.length; i++) {
      for (let j = 0; j < to.lat.length; j++) {
        if (haversineM(from.lat[i]!, from.lon[i]!, to.lat[j]!, to.lon[j]!) <= radiusM) {
          hit++;
          break;
        }
      }
    }
    return from.lat.length ? hit / from.lat.length : 0;
  };
  return Math.min(share(a, b), share(b, a));
}

function claimOldLoops(clusters: { members: string[] }[], old: OldLoop[]): (OldLoop | null)[] {
  const claimed = new Set<string>();
  const order = clusters.map((_, i) => i).sort((a, b) => clusters[b]!.members.length - clusters[a]!.members.length);
  const matched: (OldLoop | null)[] = clusters.map(() => null);
  for (const i of order) {
    const members = new Set(clusters[i]!.members);
    let best: OldLoop | null = null;
    let bestShared = 0;
    for (const loop of old) {
      if (claimed.has(loop.id)) continue;
      const shared = loop.members.filter((m) => members.has(m)).length;
      // keep identity only when more than half of the old members are in the new cluster
      if (shared * 2 > loop.members.length && shared > bestShared) {
        best = loop;
        bestShared = shared;
      }
    }
    if (best) claimed.add(best.id);
    matched[i] = best;
  }
  return matched;
}

// Re-clusters every run with GPS for the user and rewrites loops and workout_loops.
// loops.signature is home geometry: it is written to the table and never logged or returned.
// ponytail: loads every run's lat/lon on each call, fine for hundreds of runs; store per-run signatures past about 1,000.
export async function deriveLoops(userId: string): Promise<void> {
  const runs = await sql<RunSamples[]>`
    select w.id, w.distance_m, s.lat, s.lon
    from public.workouts w join public.workout_samples s on s.workout_id = w.id
    where w.user_id = ${userId} and w.type = 'run' and s.lat is not null
    order by w.start_at, w.id`;
  const sigs = new Map<string, Signature>();
  for (const run of runs) {
    const sig = signature(run.lat ?? [], run.lon ?? [], Number(run.distance_m));
    if (sig) sigs.set(run.id, sig);
  }
  const clusters = clusterLoops([...sigs].map(([id, sig]) => ({ id, sig })));

  await sql.begin(async (tx) => {
    const old = (await tx`
      select l.id, l.name, l.typical_distance_m,
        coalesce(array_agg(wl.workout_id::text) filter (where wl.workout_id is not null), '{}') as members
      from public.loops l left join public.workout_loops wl on wl.loop_id = l.id
      where l.user_id = ${userId} group by l.id`) as unknown as OldLoop[];
    const matched = claimOldLoops(clusters, old);
    await tx`delete from public.workout_loops where user_id = ${userId}`;
    const keep = matched.filter((m): m is OldLoop => m !== null).map((m) => m.id);
    if (keep.length) await tx`delete from public.loops where user_id = ${userId} and id not in ${tx(keep)}`;
    else await tx`delete from public.loops where user_id = ${userId}`;

    const memberships: { workout_id: string; loop_id: string; user_id: string; similarity: number; closure_m: number }[] = [];
    for (const [i, cluster] of clusters.entries()) {
      const previous = matched[i] ?? null;
      const typical = cluster.typicalDistanceM;
      const repId = cluster.members.reduce((best, id) =>
        Math.abs(sigs.get(id)!.distanceM - typical) < Math.abs(sigs.get(best)!.distanceM - typical) ? id : best);
      const rep = sigs.get(repId)!;
      // a user-given name survives; an untouched default follows the new typical distance
      const name = previous && previous.name !== defaultLoopName(Number(previous.typical_distance_m))
        ? previous.name
        : defaultLoopName(typical);
      const sigJson = tx.json(rep as unknown as Parameters<typeof tx.json>[0]);
      let loopId: string;
      if (previous) {
        loopId = previous.id;
        await tx`update public.loops set name = ${name}, typical_distance_m = ${typical}, signature = ${sigJson} where id = ${loopId}`;
      } else {
        const [created] = await tx`insert into public.loops (user_id, name, typical_distance_m, signature)
          values (${userId}, ${name}, ${typical}, ${sigJson}) returning id`;
        loopId = created!.id as string;
      }
      for (const id of cluster.members) {
        const sig = sigs.get(id)!;
        memberships.push({
          workout_id: id,
          loop_id: loopId,
          user_id: userId,
          similarity: id === repId ? 1 : similarity(sig, rep),
          closure_m: closureM(sig),
        });
      }
    }
    if (memberships.length) await tx`insert into public.workout_loops ${tx(memberships)}`;
  });
}

export async function derive1b(userId: string, workoutId: string): Promise<void> {
  await deriveEfforts(userId, workoutId);
  await deriveLoops(userId);
}

// After a delete the PB chain and the loops can both change.
export async function rederiveUser(userId: string): Promise<void> {
  await sql.begin((tx) => refreshPbs(tx, userId));
  await deriveLoops(userId);
}

const CURSOR = /^[0-9:+. -]{10,40}\|[0-9a-f-]{36}$/;
export const isCursor = (value: unknown): value is string => typeof value === "string" && CURSOR.test(value);

// One slice of a recompute: oldest first, from stored samples only. next is null when the slice reached the end.
export async function recomputeBatch(after: string | null, limit = RECOMPUTE_BATCH): Promise<{ processed: number; next: string | null }> {
  const [afterTs, afterId] = after ? after.split("|") : [null, null];
  const rows = await sql<{ id: string; user_id: string; ts: string }[]>`
    select w.id, w.user_id, w.start_at::text as ts
    from public.workouts w
    where w.type = 'run' and exists (select 1 from public.workout_samples s where s.workout_id = w.id)
      and (${afterTs}::timestamptz is null or (w.start_at, w.id) > (${afterTs}::timestamptz, ${afterId}::uuid))
    order by w.start_at, w.id
    limit ${limit + 1}`;
  const slice = rows.slice(0, limit);
  for (const row of slice) await deriveEfforts(row.user_id, row.id);
  const last = slice.at(-1);
  if (rows.length > limit && last) return { processed: slice.length, next: `${last.ts}|${last.id}` };
  const users = await sql<{ user_id: string }[]>`select distinct user_id from public.workouts where type = 'run'`;
  for (const { user_id } of users) await deriveLoops(user_id);
  return { processed: slice.length, next: null };
}
