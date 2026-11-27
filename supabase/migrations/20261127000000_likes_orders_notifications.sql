-- =============================================================================
-- Abdullah Imported Goods — 6: Likes, cash-on-delivery orders, notifications
-- Run this file after the first five. It is safe to run more than once.
-- =============================================================================
--
-- • Visitors can like products (one like per browser) and place cash-on-
--   delivery orders, ONLY through the validated functions below.
-- • Every new order and like creates an admin notification (the bell in the
--   admin panel). Admin phones/computers can also receive push notifications.
-- • Only admins can read orders, notifications and push devices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.product_likes (
  product_id uuid not null references public.products (id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (product_id, visitor_id)
);

create index if not exists product_likes_created_idx on public.product_likes (created_at desc);

comment on table public.product_likes is
  'One row per browser that liked a product (anonymous random browser ID). Written only by set_product_like().';

create sequence if not exists public.order_number_seq as integer start with 1;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      integer not null default nextval('public.order_number_seq'),
  product_id        uuid references public.products (id) on delete set null,
  -- Snapshot of the product when the order was placed (later edits don't change old orders)
  product_name      text not null,
  product_code      text not null,
  product_slug      text not null,
  product_image_url text not null default '',
  unit_price        numeric(12, 2),
  quantity          integer not null default 1,
  customer_name     text not null,
  customer_whatsapp text not null,
  customer_address  text not null,
  customer_note     text not null default '',
  status            text not null default 'new',
  admin_note        text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_order_number_key unique (order_number),
  constraint orders_status_check     check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  constraint orders_quantity_check   check (quantity between 1 and 9999),
  constraint orders_name_check       check (char_length(btrim(customer_name)) between 2 and 80),
  constraint orders_whatsapp_check   check (customer_whatsapp ~ '^[1-9][0-9]{9,14}$'),
  constraint orders_address_check    check (char_length(btrim(customer_address)) between 5 and 500),
  constraint orders_note_check       check (char_length(customer_note) <= 500),
  constraint orders_admin_note_check check (char_length(admin_note) <= 1000)
);

alter sequence public.order_number_seq owned by public.orders.order_number;

create index if not exists orders_created_idx          on public.orders (created_at desc);
create index if not exists orders_status_created_idx   on public.orders (status, created_at desc);
create index if not exists orders_whatsapp_created_idx on public.orders (customer_whatsapp, created_at desc);
create index if not exists orders_product_idx          on public.orders (product_id);

comment on table public.orders is
  'Cash-on-delivery orders. Created only by place_order(); read and updated by admins.';

create table if not exists public.admin_notifications (
  id         bigint generated always as identity primary key,
  kind       text not null,
  title      text not null,
  body       text not null default '',
  link       text not null default '/admin',
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  constraint admin_notifications_kind_check  check (kind in ('order', 'like')),
  constraint admin_notifications_link_check  check (link ~ '^/admin(/[A-Za-z0-9/_-]*)?$'),
  constraint admin_notifications_dedupe_key  unique (dedupe_key)
);

create index if not exists admin_notifications_created_idx on public.admin_notifications (created_at desc);
create index if not exists admin_notifications_unread_idx  on public.admin_notifications (created_at desc) where read_at is null;

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  device_label  text not null default '',
  notify_orders boolean not null default true,
  notify_likes  boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key   unique (endpoint),
  constraint push_subscriptions_endpoint_check check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  constraint push_subscriptions_keys_check     check (p256dh ~ '^[A-Za-z0-9_=-]{20,200}$' and auth ~ '^[A-Za-z0-9_=-]{8,100}$'),
  constraint push_subscriptions_label_check    check (char_length(device_label) <= 120)
);

-- Private server settings (e.g. the fingerprint of the push-sending secret).
-- No API access at all.
create table if not exists public.app_private_settings (
  name       text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Order helpers
-- -----------------------------------------------------------------------------
create or replace function public.format_order_number(p_number integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ORD-' || lpad(p_number::text, greatest(4, length(p_number::text)), '0');
$$;

create or replace function public.handle_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.order_number := old.order_number;
  new.created_at   := old.created_at;
  new.updated_at   := now();
  return new;
end;
$$;

drop trigger if exists orders_handle_update on public.orders;
create trigger orders_handle_update
  before update on public.orders
  for each row execute function public.handle_order_update();

-- -----------------------------------------------------------------------------
-- Security: RLS + privileges
-- -----------------------------------------------------------------------------
alter table public.product_likes        enable row level security;
alter table public.orders               enable row level security;
alter table public.admin_notifications  enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.app_private_settings enable row level security;

revoke all on public.product_likes, public.orders, public.admin_notifications,
              public.push_subscriptions, public.app_private_settings from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;
revoke all on sequence public.admin_notifications_id_seq from anon, authenticated;

grant select, update, delete on public.orders              to authenticated;
grant select, update, delete on public.admin_notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders" on public.orders
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders" on public.orders
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Admins can read notifications" on public.admin_notifications;
create policy "Admins can read notifications" on public.admin_notifications
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins can update notifications" on public.admin_notifications;
create policy "Admins can update notifications" on public.admin_notifications
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins can delete notifications" on public.admin_notifications;
create policy "Admins can delete notifications" on public.admin_notifications
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Admins manage their own push devices" on public.push_subscriptions;
create policy "Admins manage their own push devices" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()))
  with check (user_id = (select auth.uid()) and (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Likes (public)
-- -----------------------------------------------------------------------------

-- Like count of a published product, and whether this browser liked it.
create or replace function public.get_like_state(p_product_id uuid, p_visitor_id uuid default null)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'count', (select count(*)::integer from public.product_likes l
               join public.products p on p.id = l.product_id
              where l.product_id = p_product_id and p.is_published),
    'liked', exists (select 1 from public.product_likes l
                      where l.product_id = p_product_id and l.visitor_id = p_visitor_id)
  );
$$;

-- Like (p_liked = true) or unlike (false). The admin is notified once per
-- browser and product, so liking/unliking repeatedly does not spam them.
create or replace function public.set_product_like(p_product_id uuid, p_visitor_id uuid, p_liked boolean default true)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name     text;
  v_code     text;
  v_rows     integer := 0;
  v_notified boolean := false;
  v_count    integer;
begin
  if p_product_id is null or p_visitor_id is null then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  select p.name, p.product_code into v_name, v_code
    from public.products p
   where p.id = p_product_id and p.is_published;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if coalesce(p_liked, true) then
    -- Flood protection: at most 120 new likes per minute in total.
    if (select count(*) from public.product_likes where created_at > now() - interval '1 minute') < 120 then
      insert into public.product_likes (product_id, visitor_id)
      values (p_product_id, p_visitor_id)
      on conflict do nothing;
      get diagnostics v_rows = row_count;
    end if;
  else
    delete from public.product_likes where product_id = p_product_id and visitor_id = p_visitor_id;
  end if;

  select count(*)::integer into v_count from public.product_likes where product_id = p_product_id;

  if v_rows > 0 then
    insert into public.admin_notifications (kind, title, body, link, dedupe_key)
    values (
      'like',
      'New like',
      format('Someone liked %s (%s). It now has %s %s.', v_name, v_code, v_count, case when v_count = 1 then 'like' else 'likes' end),
      '/admin/products/' || p_product_id || '/edit',
      'like:' || p_product_id || ':' || p_visitor_id
    )
    on conflict (dedupe_key) do nothing;
    get diagnostics v_rows = row_count;
    v_notified := v_rows > 0;
  end if;

  return json_build_object(
    'liked',        exists (select 1 from public.product_likes where product_id = p_product_id and visitor_id = p_visitor_id),
    'count',        v_count,
    'notify',       v_notified,
    'product_name', v_name,
    'product_code', v_code
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Orders (public)
-- -----------------------------------------------------------------------------
create or replace function public.place_order(
  p_product_id        uuid,
  p_quantity          integer,
  p_customer_name     text,
  p_customer_whatsapp text,
  p_customer_address  text,
  p_customer_note     text default ''
)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name    text    := btrim(coalesce(p_customer_name, ''));
  v_phone   text    := btrim(coalesce(p_customer_whatsapp, ''));
  v_address text    := btrim(coalesce(p_customer_address, ''));
  v_note    text    := btrim(coalesce(p_customer_note, ''));
  v_qty     integer := coalesce(p_quantity, 1);
  v_product record;
  v_order   public.orders;
  v_label   text;
begin
  if v_qty < 1 or v_qty > 9999 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 80 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if v_phone !~ '^[1-9][0-9]{9,14}$' then
    raise exception 'INVALID_WHATSAPP' using errcode = '22023';
  end if;
  if char_length(v_address) not between 5 and 500 then
    raise exception 'INVALID_ADDRESS' using errcode = '22023';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  select p.id, p.name, p.product_code, p.slug, p.image_url, p.price, p.status
    into v_product
    from public.products p
   where p.id = p_product_id and p.is_published;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'available' then
    raise exception 'PRODUCT_BOOKED' using errcode = 'P0001';
  end if;

  -- Abuse protection: 5 orders per WhatsApp number per hour, 50 per 10 minutes overall.
  if (select count(*) from public.orders
       where customer_whatsapp = v_phone and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 50 then
    raise exception 'ORDER_RATE_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.orders (
    product_id, product_name, product_code, product_slug, product_image_url, unit_price,
    quantity, customer_name, customer_whatsapp, customer_address, customer_note
  ) values (
    v_product.id, v_product.name, v_product.product_code, v_product.slug, coalesce(v_product.image_url, ''), v_product.price,
    v_qty, v_name, v_phone, v_address, v_note
  )
  returning * into v_order;

  v_label := public.format_order_number(v_order.order_number);

  insert into public.admin_notifications (kind, title, body, link, dedupe_key)
  values (
    'order',
    'New order ' || v_label,
    format('%s × %s (%s) — %s', v_qty, v_product.name, v_product.product_code, v_name),
    '/admin/orders/' || v_order.id,
    'order:' || v_order.id
  );

  -- Housekeeping: notifications older than 90 days are removed.
  if random() < 0.05 then
    delete from public.admin_notifications where created_at < now() - interval '90 days';
  end if;

  return json_build_object(
    'order_id',     v_order.id,
    'order_number', v_order.order_number,
    'order_label',  v_label,
    'product_name', v_product.name,
    'product_code', v_product.product_code,
    'quantity',     v_qty,
    'unit_price',   v_product.price,
    'customer_name', v_name
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: orders
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_orders(
  p_status text    default null,
  p_query  text    default null,
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, order_number integer, product_id uuid, product_name text, product_code text,
  product_slug text, product_image_url text, unit_price numeric, quantity integer,
  customer_name text, customer_whatsapp text, customer_address text, customer_note text,
  status text, admin_note text, created_at timestamptz, updated_at timestamptz, total_count integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_query  text := nullif(btrim(coalesce(p_query, '')), '');
  v_digits text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view orders' using errcode = '42501';
  end if;
  v_digits := nullif(regexp_replace(coalesce(v_query, ''), '[^0-9]', '', 'g'), '');

  return query
  select o.id, o.order_number, o.product_id, o.product_name, o.product_code,
         o.product_slug, o.product_image_url, o.unit_price, o.quantity,
         o.customer_name, o.customer_whatsapp, o.customer_address, o.customer_note,
         o.status, o.admin_note, o.created_at, o.updated_at,
         (count(*) over ())::integer
    from public.orders o
   where (p_status is null or p_status = 'all' or o.status = p_status)
     and (
       v_query is null
       or o.customer_name ilike '%' || public.escape_like(v_query) || '%' escape '\'
       or o.product_name  ilike '%' || public.escape_like(v_query) || '%' escape '\'
       or o.product_code  ilike '%' || public.escape_like(v_query) || '%' escape '\'
       or (v_digits is not null and (
             o.order_number::text = ltrim(v_digits, '0')
             or o.customer_whatsapp like '%' || right(v_digits, 9) || '%'
          ))
     )
   order by o.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_order_counts()
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view orders' using errcode = '42501';
  end if;
  return (
    select json_build_object(
      'all',       count(*)::integer,
      'new',       (count(*) filter (where status = 'new'))::integer,
      'confirmed', (count(*) filter (where status = 'confirmed'))::integer,
      'shipped',   (count(*) filter (where status = 'shipped'))::integer,
      'delivered', (count(*) filter (where status = 'delivered'))::integer,
      'cancelled', (count(*) filter (where status = 'cancelled'))::integer
    )
    from public.orders
  );
end;
$$;

create or replace function public.admin_get_order(p_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view orders' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_id;
  if not found then
    return null;
  end if;
  return json_build_object(
    'order', to_json(v_order),
    'product', (select json_build_object('id', p.id, 'status', p.status, 'is_published', p.is_published, 'slug', p.slug)
                  from public.products p where p.id = v_order.product_id)
  );
end;
$$;

-- Change the status only if it is still p_from (protects against two admins
-- clicking at the same time). Raises ORDER_CHANGED otherwise.
create or replace function public.admin_set_order_status(p_id uuid, p_from text, p_to text)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update orders' using errcode = '42501';
  end if;
  if p_to not in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;

  update public.orders set status = p_to
   where id = p_id and status = p_from
  returning status into v_status;

  if v_status is null then
    if exists (select 1 from public.orders where id = p_id) then
      raise exception 'ORDER_CHANGED' using errcode = 'P0001';
    end if;
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_status;
end;
$$;

create or replace function public.admin_set_order_note(p_id uuid, p_note text)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update orders' using errcode = '42501';
  end if;
  update public.orders set admin_note = left(btrim(coalesce(p_note, '')), 1000) where id = p_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_delete_order(p_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete orders' using errcode = '42501';
  end if;
  delete from public.orders where id = p_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: likes
-- -----------------------------------------------------------------------------
create or replace function public.admin_like_stats()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today_at timestamptz := ((now() at time zone 'Asia/Karachi')::date)::timestamp at time zone 'Asia/Karachi';
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view likes' using errcode = '42501';
  end if;
  return json_build_object(
    'total', (select count(*)::integer from public.product_likes),
    'today', (select count(*)::integer from public.product_likes where created_at >= v_today_at),
    'top', (
      select coalesce(json_agg(t order by t.likes desc, t.name), '[]'::json)
      from (
        select p.id, p.name, p.product_code, p.image_url, p.status, count(*)::integer as likes
          from public.product_likes l
          join public.products p on p.id = l.product_id
         group by p.id
         order by likes desc, p.name
         limit 5
      ) t
    )
  );
end;
$$;

create or replace function public.admin_product_like_counts(p_product_ids uuid[])
returns table (product_id uuid, likes integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view likes' using errcode = '42501';
  end if;
  return query
  select l.product_id, count(*)::integer
    from public.product_likes l
   where l.product_id = any (coalesce(p_product_ids, '{}'::uuid[]))
   group by l.product_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: notifications (the bell)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_notifications(p_limit integer default 20)
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view notifications' using errcode = '42501';
  end if;
  return json_build_object(
    'unread', (select count(*)::integer from public.admin_notifications where read_at is null),
    'items', (
      select coalesce(json_agg(t order by t.id desc), '[]'::json)
      from (
        select n.id, n.kind, n.title, n.body, n.link, n.created_at, n.read_at
          from public.admin_notifications n
         order by n.id desc
         limit least(greatest(coalesce(p_limit, 20), 1), 50)
      ) t
    )
  );
end;
$$;

-- Marks the given notifications (or all, when p_ids is null) as read.
create or replace function public.admin_mark_notifications_read(p_ids bigint[] default null)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update notifications' using errcode = '42501';
  end if;
  update public.admin_notifications set read_at = now()
   where read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: push devices
-- -----------------------------------------------------------------------------

-- Saves this device's push subscription for the signed-in admin, and records
-- the fingerprint (SHA-256) of the website server's push secret.
create or replace function public.admin_save_push_subscription(
  p_endpoint     text,
  p_p256dh       text,
  p_auth         text,
  p_device_label text,
  p_secret_hash  text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can turn on notifications' using errcode = '42501';
  end if;
  if coalesce(p_secret_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_SECRET_HASH' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_device_label, ''), 120))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        device_label = excluded.device_label;

  insert into public.app_private_settings (name, value)
  values ('push_secret_sha256', p_secret_hash)
  on conflict (name) do update set value = excluded.value, updated_at = now();
end;
$$;

create or replace function public.admin_list_push_devices()
returns table (endpoint text, device_label text, notify_orders boolean, notify_likes boolean, created_at timestamptz)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view notification devices' using errcode = '42501';
  end if;
  return query
  select s.endpoint, s.device_label, s.notify_orders, s.notify_likes, s.created_at
    from public.push_subscriptions s
   where s.user_id = auth.uid()
   order by s.created_at desc;
end;
$$;

create or replace function public.admin_update_push_device(p_endpoint text, p_notify_orders boolean, p_notify_likes boolean)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change notification settings' using errcode = '42501';
  end if;
  update public.push_subscriptions
     set notify_orders = coalesce(p_notify_orders, notify_orders),
         notify_likes  = coalesce(p_notify_likes, notify_likes)
   where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

create or replace function public.admin_delete_push_device(p_endpoint text)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change notification settings' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

-- -----------------------------------------------------------------------------
-- Push sending (website server only): requires the server's push secret, which
-- only the website server knows. Returns nothing for a wrong secret.
-- -----------------------------------------------------------------------------
create or replace function public.push_secret_matches(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_private_settings
     where name = 'push_secret_sha256'
       and value = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
  );
$$;

create or replace function public.get_push_targets(p_secret text, p_kind text, p_endpoint text default null)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_matches(p_secret) then
    return;
  end if;
  return query
  select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
   where (p_endpoint is null or s.endpoint = p_endpoint)
     and case p_kind
           when 'order' then s.notify_orders
           when 'like'  then s.notify_likes
           when 'test'  then true
           else false
         end;
end;
$$;

-- Removes a device whose push subscription has expired (push service said 404/410).
create or replace function public.remove_push_target(p_secret text, p_endpoint text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if public.push_secret_matches(p_secret) then
    delete from public.push_subscriptions where endpoint = p_endpoint;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.format_order_number(integer) from public;
grant execute on function public.format_order_number(integer) to anon, authenticated;

revoke all on function public.handle_order_update() from public, anon, authenticated;
revoke all on function public.push_secret_matches(text) from public, anon, authenticated;

revoke all on function public.get_like_state(uuid, uuid) from public;
grant execute on function public.get_like_state(uuid, uuid) to anon, authenticated;
revoke all on function public.set_product_like(uuid, uuid, boolean) from public;
grant execute on function public.set_product_like(uuid, uuid, boolean) to anon, authenticated;
revoke all on function public.place_order(uuid, integer, text, text, text, text) from public;
grant execute on function public.place_order(uuid, integer, text, text, text, text) to anon, authenticated;
revoke all on function public.get_push_targets(text, text, text) from public;
grant execute on function public.get_push_targets(text, text, text) to anon, authenticated;
revoke all on function public.remove_push_target(text, text) from public;
grant execute on function public.remove_push_target(text, text) to anon, authenticated;

revoke all on function public.admin_list_orders(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_orders(text, text, integer, integer) to authenticated;
revoke all on function public.admin_order_counts() from public, anon;
grant execute on function public.admin_order_counts() to authenticated;
revoke all on function public.admin_get_order(uuid) from public, anon;
grant execute on function public.admin_get_order(uuid) to authenticated;
revoke all on function public.admin_set_order_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;
revoke all on function public.admin_set_order_note(uuid, text) from public, anon;
grant execute on function public.admin_set_order_note(uuid, text) to authenticated;
revoke all on function public.admin_delete_order(uuid) from public, anon;
grant execute on function public.admin_delete_order(uuid) to authenticated;
revoke all on function public.admin_like_stats() from public, anon;
grant execute on function public.admin_like_stats() to authenticated;
revoke all on function public.admin_product_like_counts(uuid[]) from public, anon;
grant execute on function public.admin_product_like_counts(uuid[]) to authenticated;
revoke all on function public.admin_list_notifications(integer) from public, anon;
grant execute on function public.admin_list_notifications(integer) to authenticated;
revoke all on function public.admin_mark_notifications_read(bigint[]) from public, anon;
grant execute on function public.admin_mark_notifications_read(bigint[]) to authenticated;
revoke all on function public.admin_save_push_subscription(text, text, text, text, text) from public, anon;
grant execute on function public.admin_save_push_subscription(text, text, text, text, text) to authenticated;
revoke all on function public.admin_list_push_devices() from public, anon;
grant execute on function public.admin_list_push_devices() to authenticated;
revoke all on function public.admin_update_push_device(text, boolean, boolean) from public, anon;
grant execute on function public.admin_update_push_device(text, boolean, boolean) to authenticated;
revoke all on function public.admin_delete_push_device(text) from public, anon;
grant execute on function public.admin_delete_push_device(text) to authenticated;
