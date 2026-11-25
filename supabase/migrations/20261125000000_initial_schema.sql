-- =============================================================================
-- Abdullah Imported Goods — 1/4: Tables, indexes, triggers and functions
-- Run this file first (Supabase Dashboard → SQL Editor → New query → Run).
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- admin_users: Supabase Auth users that are allowed to manage the catalog.
-- Rows can ONLY be added from the SQL Editor (there is no API write access).
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Authorized administrators. Add rows from the SQL Editor only — never from the app.';

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_slug_key unique (slug)
);

create unique index if not exists categories_name_lower_key
  on public.categories (lower(btrim(name)));

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create sequence if not exists public.product_code_seq as bigint start with 1;

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  product_code   text not null,
  name           text not null,
  slug           text not null,
  description    text not null default '',
  price          numeric(12, 2),
  category_id    uuid references public.categories (id) on delete restrict,
  image_url      text not null,
  image_path     text not null,
  status         text not null default 'available',
  is_published   boolean not null default false,
  is_new_arrival boolean not null default false,
  version        integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint products_product_code_key unique (product_code),
  constraint products_slug_key unique (slug),
  constraint products_name_length check (char_length(btrim(name)) between 1 and 150),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_description_length check (char_length(description) <= 5000),
  constraint products_price_range check (price is null or (price >= 0 and price <= 9999999999)),
  constraint products_status_check check (status in ('available', 'booked')),
  constraint products_image_path_format check (image_path ~ '^products/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$')
);

comment on column public.products.price is 'Price in the shop currency. NULL means "price on request".';
comment on column public.products.version is 'Incremented on every update. Used for optimistic concurrency between admins.';

-- Indexes for listing, filtering and searching
create index if not exists products_published_created_idx on public.products (is_published, created_at desc);
create index if not exists products_category_idx          on public.products (category_id);
create index if not exists products_status_idx            on public.products (status);
create index if not exists products_price_idx             on public.products (price);
create index if not exists products_new_arrival_idx       on public.products (created_at desc) where is_new_arrival;
create index if not exists products_name_idx              on public.products (name);
create index if not exists products_name_trgm_idx         on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists products_code_trgm_idx         on public.products using gin (product_code extensions.gin_trgm_ops);
create index if not exists products_description_trgm_idx  on public.products using gin (description extensions.gin_trgm_ops);
-- (slug and product_code already have unique indexes from their constraints)

-- Assign a sequential, human-friendly product code: AIG-001, AIG-002, ... AIG-1000
-- Runs as the table owner so the app never needs direct access to the sequence,
-- and any client-supplied product_code is ignored.
create or replace function public.set_product_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint;
begin
  n := nextval('public.product_code_seq');
  new.product_code := 'AIG-' || lpad(n::text, greatest(3, length(n::text)), '0');
  new.version := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_set_product_code on public.products;
create trigger products_set_product_code
  before insert on public.products
  for each row execute function public.set_product_code();

-- Keep updated_at / version accurate and protect immutable columns.
create or replace function public.handle_product_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.product_code := old.product_code;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists products_handle_update on public.products;
create trigger products_handle_update
  before update on public.products
  for each row execute function public.handle_product_update();

-- -----------------------------------------------------------------------------
-- admin_settings (single row, id = 1)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_settings (
  id              smallint primary key default 1,
  business_name   text not null default 'Abdullah Imported Goods',
  logo_url        text,
  logo_path       text,
  whatsapp_number text not null default '',
  currency        text not null default 'PKR',
  welcome_text    text not null default 'Quality imported goods at wholesale prices. Browse our latest stock and book instantly on WhatsApp.',
  contact_phone   text,
  contact_email   text,
  address         text,
  business_hours  text,
  updated_at      timestamptz not null default now(),
  constraint admin_settings_singleton check (id = 1),
  constraint admin_settings_business_name_length check (char_length(btrim(business_name)) between 1 and 100),
  constraint admin_settings_whatsapp_format check (whatsapp_number = '' or whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  constraint admin_settings_currency_format check (currency ~ '^[A-Za-z.]{1,10}$'),
  constraint admin_settings_welcome_length check (char_length(welcome_text) <= 500),
  constraint admin_settings_logo_path_format check (logo_path is null or logo_path ~ '^branding/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$')
);

comment on column public.admin_settings.whatsapp_number is
  'International format without + or spaces, e.g. 923001234567';

insert into public.admin_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.handle_settings_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists admin_settings_handle_update on public.admin_settings;
create trigger admin_settings_handle_update
  before update on public.admin_settings
  for each row execute function public.handle_settings_update();

-- -----------------------------------------------------------------------------
-- Helper: escape LIKE wildcards in user search input
-- -----------------------------------------------------------------------------
create or replace function public.escape_like(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- -----------------------------------------------------------------------------
-- search_products: catalog search used by the public site and the admin panel.
-- SECURITY INVOKER — Row Level Security still applies, so visitors can never
-- see draft products even if they pass p_publication = 'all'.
-- Every word in p_query must match the name, product code, description or
-- category name.
-- -----------------------------------------------------------------------------
create or replace function public.search_products(
  p_query            text    default null,
  p_category_slug    text    default null,
  p_available_only   boolean default false,
  p_new_arrivals_only boolean default false,
  p_sort             text    default 'newest',
  p_limit            integer default 24,
  p_offset           integer default 0,
  p_publication      text    default 'published',
  p_status           text    default null
)
returns table (
  id             uuid,
  product_code   text,
  name           text,
  slug           text,
  description    text,
  price          numeric,
  category_id    uuid,
  category_name  text,
  category_slug  text,
  image_url      text,
  image_path     text,
  status         text,
  is_published   boolean,
  is_new_arrival boolean,
  version        integer,
  created_at     timestamptz,
  updated_at     timestamptz,
  total_count    bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select array(
      select public.escape_like(t)
      from regexp_split_to_table(btrim(coalesce(p_query, '')), '\s+') as t
      where t <> ''
      limit 8
    ) as words
  ),
  filtered as (
    select
      p.id, p.product_code, p.name, p.slug, p.description, p.price, p.category_id,
      c.name as category_name, c.slug as category_slug,
      p.image_url, p.image_path, p.status, p.is_published, p.is_new_arrival,
      p.version, p.created_at, p.updated_at
    from public.products p
    left join public.categories c on c.id = p.category_id
    cross join terms
    where
      (case coalesce(p_publication, 'published')
         when 'all'   then true
         when 'draft' then not p.is_published
         else p.is_published
       end)
      and (
        coalesce(p_category_slug, '') = ''
        or (p_category_slug = '__none__' and p.category_id is null)
        or c.slug = p_category_slug
      )
      and (not coalesce(p_available_only, false) or p.status = 'available')
      and (p_status is null or p.status = p_status)
      and (not coalesce(p_new_arrivals_only, false) or p.is_new_arrival)
      and not exists (
        select 1
        from unnest(terms.words) as w
        where not (
             p.name ilike '%' || w || '%'
          or p.product_code ilike '%' || w || '%'
          or p.description ilike '%' || w || '%'
          or coalesce(c.name, '') ilike '%' || w || '%'
        )
      )
  )
  select
    f.id, f.product_code, f.name, f.slug, f.description, f.price, f.category_id,
    f.category_name, f.category_slug, f.image_url, f.image_path, f.status,
    f.is_published, f.is_new_arrival, f.version, f.created_at, f.updated_at,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'price_asc'  then f.price end asc  nulls last,
    case when p_sort = 'price_desc' then f.price end desc nulls last,
    case when p_sort = 'oldest'     then f.created_at end asc,
    f.created_at desc,
    f.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- -----------------------------------------------------------------------------
-- Categories with product counts (RLS applies: visitors count published only)
-- -----------------------------------------------------------------------------
create or replace function public.get_categories_with_counts()
returns table (
  id            uuid,
  name          text,
  slug          text,
  created_at    timestamptz,
  product_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.name, c.slug, c.created_at, count(p.id) as product_count
  from public.categories c
  left join public.products p on p.category_id = c.id
  group by c.id, c.name, c.slug, c.created_at
  order by lower(c.name);
$$;
