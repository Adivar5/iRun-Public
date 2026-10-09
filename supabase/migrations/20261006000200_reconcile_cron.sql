create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule('strava-reconcile', '0 0 * * *', $$   -- 00:00 UTC = 02:00 or 03:00 Asia/Jerusalem
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/strava-reconcile',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'worker_service_key')),
    body := '{}'::jsonb)
$$);
