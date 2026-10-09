-- Sunday 16:00 UTC = 18:00 Israel Standard Time (winter) or 19:00 Israel Daylight Time (summer). pg_cron runs in UTC.
select cron.schedule('insights-weekly', '0 16 * * 0', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/insights-weekly',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'worker_service_key')),
    body := '{"trigger":"cron"}'::jsonb)
$$);
