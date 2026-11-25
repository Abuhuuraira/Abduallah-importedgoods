-- =============================================================================
-- Abdullah Imported Goods — 4/4: Starter categories
-- Run this file last. You can rename or delete these later from /admin/categories.
-- =============================================================================

insert into public.categories (name, slug) values
  ('Electronics',        'electronics'),
  ('Home Appliances',    'home-appliances'),
  ('Kitchen Items',      'kitchen-items'),
  ('Mobile Accessories', 'mobile-accessories'),
  ('Imported Gadgets',   'imported-gadgets'),
  ('Other Products',     'other-products')
on conflict (slug) do nothing;
