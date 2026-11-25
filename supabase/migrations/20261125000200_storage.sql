-- =============================================================================
-- Abdullah Imported Goods — 3/4: Storage bucket for product images and logo
-- Run this file third.
-- =============================================================================

-- Public bucket: anyone can VIEW images through their public URL, but only
-- admins can upload, replace or delete them. The bucket itself enforces the
-- maximum file size (5 MB) and allowed image types on the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only two folders are allowed: products/ and branding/
drop policy if exists "Admins can upload catalog images" on storage.objects;
create policy "Admins can upload catalog images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in ('products', 'branding')
    and (select public.is_admin())
  );

drop policy if exists "Admins can update catalog images" on storage.objects;
create policy "Admins can update catalog images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in ('products', 'branding')
    and (select public.is_admin())
  );

drop policy if exists "Admins can delete catalog images" on storage.objects;
create policy "Admins can delete catalog images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- Needed by admins for "does this file exist?" checks and for deletes.
-- (Visitors do not need this: public bucket files are served by URL, and not
-- having a public SELECT policy prevents anyone from listing all files.)
drop policy if exists "Admins can read catalog image metadata" on storage.objects;
create policy "Admins can read catalog image metadata"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
