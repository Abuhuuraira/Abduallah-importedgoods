-- =============================================================================
-- Abdullah Imported Goods — 2/4: Row Level Security, privileges, admin helpers
-- Run this file second.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): true when the signed-in Supabase user is listed in admin_users.
-- SECURITY DEFINER so it can read admin_users regardless of RLS. It only ever
-- checks the caller's own id (auth.uid()), so it leaks nothing.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table
-- -----------------------------------------------------------------------------
alter table public.admin_users    enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.admin_settings enable row level security;

-- -----------------------------------------------------------------------------
-- Table privileges (defense in depth — RLS is the main gate, but anonymous
-- visitors do not even get INSERT/UPDATE/DELETE privileges).
-- -----------------------------------------------------------------------------
revoke all on public.admin_users, public.categories, public.products, public.admin_settings from anon, authenticated;
revoke all on sequence public.product_code_seq from anon, authenticated;

grant select on public.categories, public.products, public.admin_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant update on public.admin_settings to authenticated;
grant select on public.admin_users to authenticated;

-- -----------------------------------------------------------------------------
-- admin_users policies: a user may only see their OWN row (used to check
-- "am I an admin?"). There are no insert/update/delete policies, so nobody can
-- grant themselves admin rights through the API.
-- -----------------------------------------------------------------------------
drop policy if exists "Users can see their own admin row" on public.admin_users;
create policy "Users can see their own admin row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- categories policies
-- -----------------------------------------------------------------------------
drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert categories" on public.categories;
create policy "Admins can insert categories"
  on public.categories for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update categories" on public.categories;
create policy "Admins can update categories"
  on public.categories for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories"
  on public.categories for delete
  to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- products policies — visitors only ever see PUBLISHED products
-- -----------------------------------------------------------------------------
drop policy if exists "Published products are public; admins see all" on public.products;
create policy "Published products are public; admins see all"
  on public.products for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- admin_settings policies — public business info is readable by everyone
-- -----------------------------------------------------------------------------
drop policy if exists "Anyone can read business settings" on public.admin_settings;
create policy "Anyone can read business settings"
  on public.admin_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can update business settings" on public.admin_settings;
create policy "Admins can update business settings"
  on public.admin_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Admin-only helper functions
-- -----------------------------------------------------------------------------

-- Delete a category. If products still use it, they must be explicitly moved
-- (to another category, or to "Uncategorized" when p_target_category_id is
-- NULL) in the same transaction — otherwise CATEGORY_HAS_PRODUCTS is raised.
create or replace function public.delete_category(
  p_category_id        uuid,
  p_move_products      boolean default false,
  p_target_category_id uuid    default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_moved integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete categories' using errcode = '42501';
  end if;

  perform 1 from public.categories where id = p_category_id for update;
  if not found then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count from public.products where category_id = p_category_id;

  if v_count > 0 then
    if not coalesce(p_move_products, false) then
      raise exception 'CATEGORY_HAS_PRODUCTS'
        using errcode = 'P0001',
              detail = v_count::text,
              hint = 'Move the products to another category before deleting it.';
    end if;

    if p_target_category_id is not null then
      if p_target_category_id = p_category_id then
        raise exception 'Choose a different category to move the products into' using errcode = '22023';
      end if;
      perform 1 from public.categories where id = p_target_category_id;
      if not found then
        raise exception 'The category you chose to move products into no longer exists' using errcode = 'P0002';
      end if;
    end if;

    update public.products
       set category_id = p_target_category_id
     where category_id = p_category_id;
    get diagnostics v_moved = row_count;
  end if;

  delete from public.categories where id = p_category_id;
  return v_moved;
end;
$$;

-- Dashboard statistics in one round trip.
create or replace function public.get_dashboard_stats()
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view dashboard statistics' using errcode = '42501';
  end if;

  return json_build_object(
    'total_products',     (select count(*) from public.products),
    'published_products', (select count(*) from public.products where is_published),
    'draft_products',     (select count(*) from public.products where not is_published),
    'available_products', (select count(*) from public.products where status = 'available'),
    'booked_products',    (select count(*) from public.products where status = 'booked'),
    'total_categories',   (select count(*) from public.categories)
  );
end;
$$;

-- Function execute privileges
revoke all on function public.delete_category(uuid, boolean, uuid) from public, anon;
grant execute on function public.delete_category(uuid, boolean, uuid) to authenticated;

revoke all on function public.get_dashboard_stats() from public, anon;
grant execute on function public.get_dashboard_stats() to authenticated;

revoke all on function public.search_products(text, text, boolean, boolean, text, integer, integer, text, text) from public;
grant execute on function public.search_products(text, text, boolean, boolean, text, integer, integer, text, text) to anon, authenticated;

revoke all on function public.get_categories_with_counts() from public;
grant execute on function public.get_categories_with_counts() to anon, authenticated;

revoke all on function public.escape_like(text) from public;
grant execute on function public.escape_like(text) to anon, authenticated;

-- Trigger functions must never be callable through the API
revoke all on function public.set_product_code() from public, anon, authenticated;
revoke all on function public.handle_product_update() from public, anon, authenticated;
revoke all on function public.handle_settings_update() from public, anon, authenticated;
