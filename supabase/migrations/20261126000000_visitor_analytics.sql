-- =============================================================================
-- Abdullah Imported Goods — 5: Visitor statistics (Admin → Visitors)
-- Run this file after the first four. It is safe to run more than once.
-- =============================================================================
--
-- Privacy by design:
--   • Each browser gets a random ID that is stored only in that browser.
--   • No names, emails, phone numbers, IP addresses or cookies are stored.
--   • Visit history older than 90 days is deleted automatically.
--
-- Visitors can only RECORD visits, through two small functions that validate
-- everything. Only admins can READ the statistics.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- One row per visit (a visit ends after 30 minutes without activity).
create table if not exists public.analytics_sessions (
  id             uuid primary key,
  visitor_id     uuid not null,
  started_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  landing_path   text not null,
  current_path   text not null,
  referrer       text not null default 'direct',
  device         text not null default 'desktop',
  is_new_visitor boolean not null default false,
  page_views     integer not null default 0,
  constraint analytics_sessions_device_check   check (device in ('mobile', 'tablet', 'desktop')),
  constraint analytics_sessions_referrer_check check (referrer ~ '^[a-z0-9.-]{1,100}$'),
  constraint analytics_sessions_paths_check    check (char_length(landing_path) <= 300 and char_length(current_path) <= 300)
);

comment on table public.analytics_sessions is
  'Anonymous website visits for Admin → Visitors. Written only by track_page_view / track_heartbeat.';

-- One row per page opened during a visit.
create table if not exists public.analytics_page_views (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.analytics_sessions (id) on delete cascade,
  path       text not null,
  product_id uuid references public.products (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint analytics_page_views_path_check check (char_length(path) <= 300)
);

comment on table public.analytics_page_views is
  'Anonymous page views for Admin → Visitors. Written only by track_page_view.';

create index if not exists analytics_sessions_last_seen_idx  on public.analytics_sessions (last_seen_at desc);
create index if not exists analytics_sessions_started_idx    on public.analytics_sessions (started_at desc);
create index if not exists analytics_page_views_created_idx  on public.analytics_page_views (created_at desc);
create index if not exists analytics_page_views_session_idx  on public.analytics_page_views (session_id);
create index if not exists analytics_page_views_product_idx  on public.analytics_page_views (product_id, created_at desc)
  where product_id is not null;

-- Nobody can read or write these tables directly through the API. RLS is on
-- with no policies; access goes only through the functions below.
alter table public.analytics_sessions   enable row level security;
alter table public.analytics_page_views enable row level security;
revoke all on public.analytics_sessions, public.analytics_page_views from anon, authenticated;
revoke all on sequence public.analytics_page_views_id_seq from anon, authenticated;

-- -----------------------------------------------------------------------------
-- track_page_view(): called by the website each time a visitor opens a page.
-- Ignores anything invalid instead of raising errors, so tracking can never
-- break the website.
-- -----------------------------------------------------------------------------
create or replace function public.track_page_view(
  p_session_id  uuid,
  p_visitor_id  uuid,
  p_path        text,
  p_referrer    text    default null,
  p_device      text    default null,
  p_new_visitor boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_path       text := coalesce(p_path, '');
  v_referrer   text := lower(btrim(coalesce(p_referrer, '')));
  v_device     text := case when p_device in ('mobile', 'tablet', 'desktop') then p_device else 'desktop' end;
  v_session    uuid;
  v_product_id uuid;
begin
  if p_session_id is null or p_visitor_id is null then
    return;
  end if;

  -- Only public website pages, in a plain URL-path format (never admin or API).
  if char_length(v_path) > 300
     or v_path !~ '^/[A-Za-z0-9/_.~%-]*$'
     or v_path ~* '^/(admin|api)(/|$)' then
    return;
  end if;

  if v_referrer !~ '^[a-z0-9.-]{1,100}$' then
    v_referrer := 'direct';
  end if;

  -- Flood protection: at most 300 page views per minute in total.
  if (select count(*) from public.analytics_page_views
       where created_at > now() - interval '1 minute') >= 300 then
    return;
  end if;

  insert into public.analytics_sessions as s
    (id, visitor_id, landing_path, current_path, referrer, device, is_new_visitor, page_views)
  values
    (p_session_id, p_visitor_id, v_path, v_path, v_referrer, v_device, coalesce(p_new_visitor, false), 1)
  on conflict (id) do update
    set last_seen_at = now(),
        current_path = excluded.current_path,
        page_views   = s.page_views + 1
    -- A visit can only be continued by the browser that started it, and is
    -- capped at 200 page views.
    where s.visitor_id = excluded.visitor_id
      and s.page_views < 200
  returning s.id into v_session;

  if v_session is null then
    return;
  end if;

  if v_path ~ '^/products/[a-z0-9]+(-[a-z0-9]+)*$' then
    select p.id into v_product_id
      from public.products p
     where p.slug = substr(v_path, 11)
       and p.is_published;
  end if;

  insert into public.analytics_page_views (session_id, path, product_id)
  values (p_session_id, v_path, v_product_id);

  -- Housekeeping (about 1 in 100 calls): delete history older than 90 days.
  if random() < 0.01 then
    delete from public.analytics_sessions   where last_seen_at < now() - interval '90 days';
    delete from public.analytics_page_views where created_at   < now() - interval '90 days';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- track_heartbeat(): sent about every 30 seconds while a visitor has the site
-- open and is using it. Powers "Active right now".
-- -----------------------------------------------------------------------------
create or replace function public.track_heartbeat(
  p_session_id uuid,
  p_visitor_id uuid
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.analytics_sessions
     set last_seen_at = now()
   where id = p_session_id
     and visitor_id = p_visitor_id
     and last_seen_at > now() - interval '30 minutes'   -- the visit is still going
     and last_seen_at < now() - interval '10 seconds';  -- no more than one write per 10 s
$$;

-- -----------------------------------------------------------------------------
-- get_visitor_live(): admin only — who is on the website right now.
-- "Active" = the page was open and in use within the last 2 minutes.
-- -----------------------------------------------------------------------------
create or replace function public.get_visitor_live()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since    timestamptz := now() - interval '2 minutes';
  v_today_at timestamptz := ((now() at time zone 'Asia/Karachi')::date)::timestamp at time zone 'Asia/Karachi';
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view visitor statistics' using errcode = '42501';
  end if;

  return json_build_object(
    'active_now', (
      select count(distinct visitor_id) from public.analytics_sessions where last_seen_at > v_since
    ),
    'last_30_minutes', (
      select count(distinct visitor_id) from public.analytics_sessions
       where last_seen_at > now() - interval '30 minutes'
    ),
    'today', (
      select json_build_object(
        'visitors',   count(distinct s.visitor_id),
        'page_views', count(*)
      )
      from public.analytics_page_views pv
      join public.analytics_sessions s on s.id = pv.session_id
      where pv.created_at >= v_today_at
    ),
    'pages', (
      select coalesce(json_agg(t order by t.visitors desc, t.path), '[]'::json)
      from (
        select s.current_path                as path,
               count(distinct s.visitor_id) as visitors,
               max(p.name)                   as product_name,
               max(p.product_code)           as product_code
          from public.analytics_sessions s
          left join public.products p
            on s.current_path like '/products/%'
           and p.slug = substr(s.current_path, 11)
         where s.last_seen_at > v_since
         group by s.current_path
         order by visitors desc, s.current_path
         limit 10
      ) t
    ),
    'checked_at', now()
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- get_visitor_stats(p_days): admin only — totals and charts for the last
-- p_days days (1–90), counted in Pakistan time.
-- -----------------------------------------------------------------------------
create or replace function public.get_visitor_stats(p_days integer default 30)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz        constant text := 'Asia/Karachi';
  v_days      integer := least(greatest(coalesce(p_days, 30), 1), 90);
  v_today     date := (now() at time zone v_tz)::date;
  v_start_day date := v_today - (v_days - 1);
  v_start     timestamptz := v_start_day::timestamp at time zone v_tz;
  v_today_at  timestamptz := v_today::timestamp at time zone v_tz;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view visitor statistics' using errcode = '42501';
  end if;

  return json_build_object(
    'days',  v_days,
    'start', v_start_day,
    'end',   v_today,

    'totals', (
      select json_build_object(
        'visitors',   count(distinct s.visitor_id),
        'visits',     count(distinct pv.session_id),
        'page_views', count(*)
      )
      from public.analytics_page_views pv
      join public.analytics_sessions s on s.id = pv.session_id
      where pv.created_at >= v_start
    ),

    'today', (
      select json_build_object(
        'visitors',   count(distinct s.visitor_id),
        'visits',     count(distinct pv.session_id),
        'page_views', count(*)
      )
      from public.analytics_page_views pv
      join public.analytics_sessions s on s.id = pv.session_id
      where pv.created_at >= v_today_at
    ),

    'visits', (
      select json_build_object(
        'new_visitors',     count(distinct visitor_id) filter (where is_new_visitor),
        'avg_seconds',      coalesce(round(avg(extract(epoch from (last_seen_at - started_at))))::integer, 0),
        'avg_pages',        coalesce(round(avg(page_views)::numeric, 1), 0)
      )
      from public.analytics_sessions
      where started_at >= v_start
    ),

    'daily', (
      select coalesce(json_agg(json_build_object(
               'day',        d.day::date,
               'visitors',   coalesce(a.visitors, 0),
               'page_views', coalesce(a.page_views, 0)
             ) order by d.day), '[]'::json)
      from generate_series(v_start_day::timestamp, v_today::timestamp, interval '1 day') as d(day)
      left join (
        select (pv.created_at at time zone v_tz)::date as day,
               count(distinct s.visitor_id)            as visitors,
               count(*)                                as page_views
          from public.analytics_page_views pv
          join public.analytics_sessions s on s.id = pv.session_id
         where pv.created_at >= v_start
         group by 1
      ) a on a.day = d.day::date
    ),

    'top_products', (
      select coalesce(json_agg(t order by t.views desc, t.name), '[]'::json)
      from (
        select p.id, p.name, p.product_code, p.slug, p.status,
               count(*)                      as views,
               count(distinct s.visitor_id) as visitors
          from public.analytics_page_views pv
          join public.analytics_sessions s on s.id = pv.session_id
          join public.products p on p.id = pv.product_id
         where pv.created_at >= v_start
         group by p.id
         order by views desc, p.name
         limit 10
      ) t
    ),

    'devices', (
      select coalesce(json_agg(t order by t.visits desc), '[]'::json)
      from (
        select device, count(*) as visits
          from public.analytics_sessions
         where started_at >= v_start
         group by device
      ) t
    ),

    'sources', (
      select coalesce(json_agg(t order by t.visits desc, t.source), '[]'::json)
      from (
        select referrer as source, count(*) as visits
          from public.analytics_sessions
         where started_at >= v_start
         group by referrer
         order by visits desc, referrer
         limit 10
      ) t
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.track_page_view(uuid, uuid, text, text, text, boolean) from public;
grant execute on function public.track_page_view(uuid, uuid, text, text, text, boolean) to anon, authenticated;

revoke all on function public.track_heartbeat(uuid, uuid) from public;
grant execute on function public.track_heartbeat(uuid, uuid) to anon, authenticated;

revoke all on function public.get_visitor_live() from public, anon;
grant execute on function public.get_visitor_live() to authenticated;

revoke all on function public.get_visitor_stats(integer) from public, anon;
grant execute on function public.get_visitor_stats(integer) to authenticated;
