-- supabase/migrations/20261005000300_vault_tokens.sql
create or replace function private.set_strava_tokens(p_user uuid, p_access text, p_refresh text, p_expires_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select access_secret_id, refresh_secret_id into c from public.strava_connections where user_id = p_user for update;
  if not found then raise exception 'no strava connection for user'; end if;
  if c.access_secret_id is null then
    update public.strava_connections set
      access_secret_id = vault.create_secret(p_access, 'strava_access_' || p_user),
      refresh_secret_id = vault.create_secret(p_refresh, 'strava_refresh_' || p_user),
      expires_at = p_expires_at
    where user_id = p_user;
  else
    perform vault.update_secret(c.access_secret_id, p_access);
    perform vault.update_secret(c.refresh_secret_id, p_refresh);
    update public.strava_connections set expires_at = p_expires_at where user_id = p_user;
  end if;
end $$;

create or replace function private.get_strava_tokens(p_user uuid)
returns table(access_token text, refresh_token text, expires_at timestamptz)
language sql security definer set search_path = '' as $$
  select a.decrypted_secret, r.decrypted_secret, c.expires_at
  from public.strava_connections c
  join vault.decrypted_secrets a on a.id = c.access_secret_id
  join vault.decrypted_secrets r on r.id = c.refresh_secret_id
  where c.user_id = p_user and c.revoked_at is null
$$;

create or replace function private.delete_strava_tokens(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select access_secret_id, refresh_secret_id into c from public.strava_connections where user_id = p_user for update;
  delete from vault.secrets where id in (c.access_secret_id, c.refresh_secret_id);
  update public.strava_connections set access_secret_id = null, refresh_secret_id = null, revoked_at = now() where user_id = p_user;
end $$;

create or replace function private.claim_sync_jobs(p_limit int)
returns setof public.sync_queue language sql security definer set search_path = '' as $$
  update public.sync_queue q set status = 'running', attempts = q.attempts + 1
  where q.id in (
    select id from public.sync_queue
    where status in ('queued','deferred') and not_before <= now()
    order by id limit p_limit for update skip locked)
  returning q.*
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
