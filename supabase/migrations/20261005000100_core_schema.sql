-- supabase/migrations/20261005000100_core_schema.sql
create schema if not exists private;

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  max_hr smallint check (max_hr between 120 and 230),
  resting_hr smallint check (resting_hr between 30 and 100),
  zone_bounds numeric[] not null default '{0.6,0.7,0.8,0.9}',
  goal_5k_pace_s_per_km int not null default 260,
  reported_5k_pace_s_per_km int default 280,
  weekly_km_target_min int not null default 30,
  weekly_km_target_max int not null default 40,
  units text not null default 'metric' check (units = 'metric'),
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  source text not null check (source = 'strava'),
  origin text not null check (origin in ('api','archive')),
  source_id text not null,
  type text not null check (type in ('run','strength','other')),
  name text,
  start_at timestamptz not null,
  duration_s int not null check (duration_s >= 0),
  moving_s int,
  distance_m real not null default 0,
  energy_kcal real,
  avg_hr real, max_hr real,
  elevation_gain_m real,
  run_kind text check (run_kind in ('easy','tempo','long','intervals','other')),
  is_leg_day boolean not null default false,
  leg_day_source text not null default 'strava' check (leg_day_source in ('strava','user')),
  has_hr boolean not null default false,
  has_route boolean not null default false,
  load real,
  efficiency real,
  zone_seconds int[],
  raw_ref jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);
create index on public.workouts (user_id, start_at desc);

create table public.strength_sets (
  workout_id uuid not null references public.workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  set_index int not null check (set_index >= 0),
  exercise_name text not null,
  muscle_groups text[] not null default '{}',
  weight_kg real,
  weight_unit_raw text,
  reps int,
  reps_unit_raw text,
  primary key (workout_id, set_index)
);

create table public.workout_samples (
  workout_id uuid primary key references public.workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  t int[] not null, d real[] not null, hr smallint[], v real[], alt real[],
  lat double precision[], lon double precision[], moving boolean[]
);

create table public.splits (
  workout_id uuid not null references public.workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  km_index int not null, pace_s_per_km real not null, avg_hr real,
  primary key (workout_id, km_index)
);

create table public.best_efforts (
  workout_id uuid not null references public.workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  distance_label text not null,
  kind text not null check (kind in ('exact','equivalent','whole_run')),
  distance_m real not null, elapsed_s real not null, start_offset_s real,
  is_pb boolean not null default false,
  primary key (workout_id, distance_label, kind)
);

create table public.loops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, typical_distance_m real not null,
  signature jsonb not null, created_at timestamptz not null default now()
);
create table public.workout_loops (
  workout_id uuid primary key references public.workouts on delete cascade,
  loop_id uuid not null references public.loops on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  similarity real not null, closure_m real
);

create table public.weekly_summaries (
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  km real not null default 0, run_count int not null default 0, duration_s int not null default 0,
  load real, long_run_km real, avg_efficiency real, zone_seconds int[],
  primary key (user_id, week_start)
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null, payload jsonb not null, model text not null,
  input_tokens int, output_tokens int, trigger text not null default 'cron' check (trigger in ('cron','manual')),
  status text not null default 'ok' check (status in ('ok','skipped','budget')),
  created_at timestamptz not null default now()
);

create table public.strava_connections (
  user_id uuid primary key references auth.users on delete cascade,
  athlete_id bigint not null unique,
  access_secret_id uuid, refresh_secret_id uuid,
  expires_at timestamptz,
  scopes text not null,
  webhook_subscription_id bigint,
  connected_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.sync_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  object_type text not null check (object_type in ('activity','athlete')),
  object_id bigint not null,
  aspect text not null check (aspect in ('create','update','delete','deauthorize')),
  event_time bigint not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed','deferred')),
  attempts int not null default 0,
  not_before timestamptz not null default now(),
  last_error text check (last_error is null or length(last_error) <= 40),
  created_at timestamptz not null default now(),
  unique (object_id, aspect, event_time)
);
create index on public.sync_queue (status, not_before);

create table public.sync_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  received_at timestamptz not null default now(),
  source text not null,
  status text not null check (status in ('ok','error','skipped')),
  count int not null default 0,
  error text check (error is null or error ~ '^[a-z_]{1,40}$')
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('strava_archive','strava_backfill')),
  status text not null default 'running' check (status in ('running','done','failed')),
  progress int not null default 0, total int, error jsonb,
  created_at timestamptz not null default now()
);
