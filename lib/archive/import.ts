import { supabaseBrowser } from "@/lib/supabase/client";
import { parseArchive } from "./parse";

export async function importArchive(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<{ inserted: number; skipped: number; jobId: string }> {
  const sb = supabaseBrowser();
  const { data: authData, error: authError } = await sb.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) throw new Error("sign_in_required");

  const { rows, skipped } = await parseArchive(await file.arrayBuffer());
  const { data: job, error: jobError } = await sb.from("import_jobs").insert({
    user_id: userId,
    kind: "strava_archive",
    status: "running",
    progress: 0,
    total: rows.length,
  }).select("id").single();
  if (jobError || !job) throw new Error("job_failed");

  let inserted = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const { data: saved, error } = await sb.from("workouts").upsert({
      user_id: userId,
      source: row.source,
      origin: row.origin,
      source_id: row.source_id,
      type: row.type,
      start_at: row.start_at,
      duration_s: row.duration_s,
      moving_s: row.moving_s,
      distance_m: row.distance_m,
      elevation_gain_m: row.elevation_gain_m,
      has_route: row.has_route,
    }, { onConflict: "user_id,source,source_id", ignoreDuplicates: true }).select("id, source_id");
    if (error) throw new Error("upsert_failed");
    const created = saved ?? [];
    inserted += created.length;
    const createdId = created[0]?.id;
    if (created.length === 1 && createdId && row.samples) {
      const { error: sampleError } = await sb.from("workout_samples").insert({
        workout_id: createdId,
        user_id: userId,
        t: row.samples.t,
        d: row.samples.d,
        alt: row.samples.alt as number[],
        lat: row.samples.lat,
        lon: row.samples.lon,
      });
      if (sampleError) throw new Error("samples_failed");
    }
    const done = i + 1;
    onProgress(done, rows.length);
    if (done % 10 === 0 || done === rows.length) {
      const { error: progressError } = await sb.from("import_jobs").update({
        progress: done,
        status: done === rows.length ? "done" : "running",
      }).eq("id", job.id);
      if (progressError) throw new Error("progress_failed");
    }
  }
  if (rows.length === 0) {
    const { error: progressError } = await sb.from("import_jobs").update({ progress: 0, status: "done" }).eq("id", job.id);
    if (progressError) throw new Error("progress_failed");
  }
  return { inserted, skipped: skipped.length, jobId: job.id };
}
