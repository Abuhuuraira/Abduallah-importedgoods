-- =============================================================================
-- Authorize an administrator
-- =============================================================================
-- 1. Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--    Enter the admin email + a strong password and tick "Auto Confirm User".
-- 2. Replace the email below with that exact email address.
-- 3. Run this query in Supabase Dashboard → SQL Editor.
--
-- Only users listed in public.admin_users can open /admin or change anything.
-- =============================================================================

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('owner@example.com')   -- ← change this
on conflict (user_id) do nothing
returning user_id;

-- If the query returns no rows, the email does not match any user in
-- Authentication → Users. Check the spelling and try again.

-- -----------------------------------------------------------------------------
-- See who is an admin:
--   select au.user_id, u.email, au.created_at
--   from public.admin_users au join auth.users u on u.id = au.user_id;
--
-- Remove an admin:
--   delete from public.admin_users
--   where user_id = (select id from auth.users where lower(email) = lower('someone@example.com'));
-- -----------------------------------------------------------------------------
