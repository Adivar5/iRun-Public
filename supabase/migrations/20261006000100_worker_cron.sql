-- supabase/migrations/20261006000100_worker_cron.sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- The operator stores two Vault secrets once per environment:
--   select vault.create_secret('<service_role_key>', 'worker_service_key');
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select cron.schedule('strava-worker', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/strava-worker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'worker_service_key')),
    body := '{}'::jsonb)
  where exists (select 1 from public.sync_queue where status in ('queued','deferred') and not_before <= now())
$$);
