create table if not exists public.rbtwar_analytics_events (
  event_id text primary key,
  received_at timestamptz not null default now(),
  ts timestamptz not null,
  app_version text,
  install_id text not null,
  session_id text not null,
  event text not null,
  level integer,
  unlocked_level integer,
  biome text,
  coins integer,
  stars_total integer,
  run_id text,
  active_seconds integer,
  wall_seconds integer,
  stars integer,
  reward_coins integer,
  unit_type text,
  from_level integer,
  to_level integer,
  cost integer,
  placement text,
  reward text,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists rbtwar_events_ts_idx on public.rbtwar_analytics_events (ts desc);
create index if not exists rbtwar_events_event_idx on public.rbtwar_analytics_events (event, ts desc);
create index if not exists rbtwar_events_level_idx on public.rbtwar_analytics_events (level, event);
create index if not exists rbtwar_events_install_idx on public.rbtwar_analytics_events (install_id, ts desc);
create index if not exists rbtwar_events_session_idx on public.rbtwar_analytics_events (session_id, ts desc);

alter table public.rbtwar_analytics_events enable row level security;
revoke all on public.rbtwar_analytics_events from anon, authenticated;
grant all on public.rbtwar_analytics_events to service_role;

create table if not exists public.rbtwar_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.rbtwar_admin_users enable row level security;
revoke all on public.rbtwar_admin_users from anon, authenticated;
grant all on public.rbtwar_admin_users to service_role;

create or replace function public.rbtwar_admin_metrics(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
with filtered as (
  select * from public.rbtwar_analytics_events
  where ts >= now() - make_interval(days => greatest(1, least(coalesce(p_days,30),365)))
),
overview as (
  select jsonb_build_object(
    'installs', count(distinct install_id),
    'sessions', count(distinct session_id) filter (where event='session_start'),
    'avg_session_seconds', coalesce(round(avg(active_seconds)) filter (where event='session_end'),0),
    'levels_started', count(*) filter (where event='level_start'),
    'wins', count(*) filter (where event='level_win'),
    'fails', count(*) filter (where event='level_fail'),
    'exits', count(*) filter (where event='level_exit'),
    'upgrades', count(*) filter (where event='unit_upgrade'),
    'ad_offers', count(*) filter (where event='ad_offer'),
    'ad_starts', count(*) filter (where event='ad_started'),
    'ad_completes', count(*) filter (where event='ad_completed'),
    'rewards', count(*) filter (where event='reward_received'),
    'max_level', coalesce(max(level),1),
    'win_rate', case when count(*) filter (where event in ('level_win','level_fail'))=0 then 0 else round(100.0 * count(*) filter (where event='level_win') / count(*) filter (where event in ('level_win','level_fail'))) end
  ) value from filtered
), level_rows as (
  select level,
    count(*) filter (where event='level_start') starts,
    count(*) filter (where event='level_win') wins,
    count(*) filter (where event='level_fail') fails,
    count(*) filter (where event='level_exit') exits,
    count(distinct install_id) filter (where event='level_start') installs,
    coalesce(round(avg(active_seconds)) filter (where event in ('level_win','level_fail')),0) avg_seconds,
    case when count(*) filter (where event in ('level_win','level_fail'))=0 then 0 else round(100.0 * count(*) filter (where event='level_win') / count(*) filter (where event in ('level_win','level_fail'))) end success_rate
  from filtered where level is not null group by level order by level
), levels as (
  select coalesce(jsonb_agg(to_jsonb(level_rows) order by level),'[]'::jsonb) value from level_rows
), ad_rows as (
  select coalesce(placement,'unknown') placement,
    count(*) filter (where event='ad_offer') offers,
    count(*) filter (where event='ad_clicked') clicks,
    count(*) filter (where event='ad_started') starts,
    count(*) filter (where event='ad_completed') completes,
    count(*) filter (where event='reward_received') rewards,
    case when count(*) filter (where event='ad_started')=0 then 0 else round(100.0 * count(*) filter (where event='ad_completed') / count(*) filter (where event='ad_started')) end completion_rate
  from filtered where event like 'ad_%' or event='reward_received' group by coalesce(placement,'unknown') order by offers desc
), ads as (
  select coalesce(jsonb_agg(to_jsonb(ad_rows)),'[]'::jsonb) value from ad_rows
), recent as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ts desc),'[]'::jsonb) value from (
    select event_id,ts,event,install_id,session_id,level,active_seconds,reward_coins,unit_type,placement
    from filtered order by ts desc limit 60
  ) x
)
select jsonb_build_object('overview',overview.value,'levels',levels.value,'ads',ads.value,'recent',recent.value)
from overview,levels,ads,recent;
$$;

revoke all on function public.rbtwar_admin_metrics(integer) from public, anon, authenticated;
grant execute on function public.rbtwar_admin_metrics(integer) to service_role;
