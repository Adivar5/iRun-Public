-- Extra goal paces. A custom goal is a distance and a pace together, or neither.
alter table public.profiles
  add column goal_10k_pace_s_per_km int not null default 300,
  add column goal_custom_distance_m real,
  add column goal_custom_pace_s_per_km int;

alter table public.profiles
  add constraint profiles_goal_10k_pace check (goal_10k_pace_s_per_km between 120 and 1200),
  add constraint profiles_goal_custom_pace check (goal_custom_pace_s_per_km is null or goal_custom_pace_s_per_km between 120 and 1200),
  add constraint profiles_goal_custom_distance check (goal_custom_distance_m is null or (goal_custom_distance_m >= 500 and goal_custom_distance_m <= 100000)),
  add constraint profiles_goal_custom_pair check (
    (goal_custom_distance_m is null and goal_custom_pace_s_per_km is null)
    or (goal_custom_distance_m is not null and goal_custom_pace_s_per_km is not null)
  );
