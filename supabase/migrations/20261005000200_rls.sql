-- supabase/migrations/20261005000200_rls.sql
create or replace function public.is_owner(row_user uuid) returns boolean
language sql stable as $$ select row_user = auth.uid() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','workouts','strength_sets','workout_samples','splits','best_efforts','loops','workout_loops',
                           'weekly_summaries','insights','strava_connections','sync_queue','sync_log','import_jobs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy owner_select on public.%I for select to authenticated using (public.is_owner(user_id))', t);
  end loop;
end $$;

-- browser-writable rows: Settings, archive import, loop rename, leg day toggle, run kind
create policy owner_write on public.profiles for all to authenticated using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy owner_update on public.workouts for update to authenticated using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy owner_insert_archive on public.workouts for insert to authenticated with check (public.is_owner(user_id) and origin = 'archive');
create policy owner_delete on public.workouts for delete to authenticated using (public.is_owner(user_id));
create policy owner_insert_samples on public.workout_samples for insert to authenticated with check (public.is_owner(user_id));
create policy owner_update_loops on public.loops for update to authenticated using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy owner_write_jobs on public.import_jobs for all to authenticated using (public.is_owner(user_id)) with check (public.is_owner(user_id));
create policy owner_delete_any on public.weekly_summaries for delete to authenticated using (public.is_owner(user_id));
create policy owner_delete_insights on public.insights for delete to authenticated using (public.is_owner(user_id));
create policy owner_delete_loops on public.loops for delete to authenticated using (public.is_owner(user_id));
create policy owner_delete_log on public.sync_log for delete to authenticated using (public.is_owner(user_id));

-- token secret ids are never selectable from the browser: column grants instead of table grants
-- (a column-level revoke does not override a table-level grant in Postgres)
revoke all on public.strava_connections from anon, authenticated;
grant select (user_id, athlete_id, expires_at, scopes, webhook_subscription_id, connected_at, revoked_at)
  on public.strava_connections to authenticated;
revoke all on schema private from public, anon, authenticated;
