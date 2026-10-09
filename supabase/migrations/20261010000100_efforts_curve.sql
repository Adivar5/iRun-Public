-- supabase/migrations/20261010000100_efforts_curve.sql
-- Reads for the pace-distance curve and per-label PB lookups.
create index best_efforts_curve_idx on public.best_efforts (user_id, distance_label, kind, elapsed_s);

-- security_invoker: the view runs with the caller's rights, so best_efforts and workouts RLS
-- (user_id = auth.uid(), AAL2) still decides every row. Without it the view would read as its owner.
create view public.pace_distance_curve with (security_invoker = true) as
select be.user_id, be.workout_id, be.distance_label, be.kind, be.distance_m, be.elapsed_s,
  (be.elapsed_s / (be.distance_m / 1000.0))::real as pace_s_per_km,
  w.start_at
from public.best_efforts be
join public.workouts w on w.id = be.workout_id
where be.kind in ('whole_run', 'exact') and be.distance_m > 0;

revoke all on public.pace_distance_curve from anon;
grant select on public.pace_distance_curve to authenticated;
