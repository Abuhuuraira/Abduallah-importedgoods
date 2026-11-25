# Abdullah Imported Goods — Wholesale Catalog

A mobile-first wholesale product catalog with WhatsApp booking and a secure admin dashboard.

- **Customers** browse and search products, see live **Available / BOOKED** status, and book or ask about a product on **WhatsApp** with one tap. The message is filled in for them.
- **Admins** sign in at `/admin`, add products with photos, publish or unpublish them, mark them **Booked / Available**, and manage categories and business settings.

> **New to deploying websites?** Follow **[DEPLOYMENT.md](./DEPLOYMENT.md)**. It walks through everything step by step.

---

## Features

**Public website**
- Homepage with hero, category chips, New Arrivals, Latest Products, and All Products with **Load more**
- Product page with large image, product ID, price (PKR), description, category, availability, date added, related products
- **Book on WhatsApp** and **Inquire on WhatsApp** buttons (official `https://wa.me/<number>?text=…` links)
- Booked products stay visible with a **BOOKED** badge, a disabled booking button, and an "Ask about future stock" option
- Search by name, product ID, description or category. Filters: category, available only, new arrivals. Sorting: newest, price low→high, price high→low
- Share and copy-link buttons, a floating WhatsApp button, and a sticky booking bar on phones
- SEO: clean URLs (`/products/<slug>`), dynamic titles and descriptions, Open Graph tags, Product JSON-LD, `sitemap.xml`, `robots.txt`
- Installable as an app (PWA) with an offline page
- Responsive grid: 2 columns on phones, 3 on tablets, 4 on desktops

**Admin dashboard** (`/admin`)
- Supabase email and password login. There is **no public sign-up**.
- Statistics: total, published, draft, available, booked, categories
- Add and edit products. Image upload includes preview, validation, in-browser compression to WebP, and a progress bar. Old images are deleted when replaced.
- Product IDs are generated automatically: `AIG-001`, `AIG-002`, …
- Product list with search, filters, pagination, and one-tap **Mark Booked / Mark Available**, Publish / Unpublish, Edit and Delete (with confirmation)
- Category management with product counts. A category that still has products can only be deleted after choosing where to move them.
- Settings: business name, logo, WhatsApp number, currency, welcome text and contact details, used across the whole site

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Supabase (Postgres, Auth, Storage) · Zod · Lucide icons · Vercel

## Project structure

```
src/
  app/
    (public)/              Customer website (home, /products, /products/[slug], /offline)
    admin/login/           Admin sign-in page
    admin/(dashboard)/     Protected admin pages (dashboard, products, categories, settings)
    api/products/          Read-only JSON endpoint used by "Load more"
    manifest.ts, robots.ts, sitemap.ts, not-found.tsx, global-error.tsx
  components/
    ui/                    shadcn/ui primitives
    site/                  Header, footer, search, mobile menu, floating WhatsApp button
    products/              Product card, grid, filters, WhatsApp and share buttons
    admin/                 Admin navigation, forms, tables, image uploader
  lib/
    supabase/              Browser, server (cookie) and public (cookie-less) clients
    actions/               Server Actions (every one re-checks admin rights)
    data/                  Cached public queries + admin queries
    validation/            Zod schemas
    auth.ts                Server-side session and admin checks
    whatsapp.ts            WhatsApp link and message builders
  proxy.ts                 Refreshes the session and guards /admin (formerly "middleware")
  types/                   App and database types
supabase/
  migrations/              SQL: schema, RLS security, storage bucket, starter categories
  create-admin.sql         Authorize your first admin
```

## Run it on your computer

Requires Node.js 20.9+ (LTS recommended) and a Supabase project (see DEPLOYMENT.md, steps 1–5).

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase URL and publishable key
npm run dev                    # http://localhost:3000  (admin: http://localhost:3000/admin)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Run the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (WhatsApp messages, validation, slugs, formatting, URL filters) |

## How security works

1. **Row Level Security (RLS)** in Postgres is the main gate. Visitors can only read *published* products, categories and public settings. Only users listed in `admin_users` can insert, update or delete anything, including storage files.
2. **No public sign-up.** Admins are created in the Supabase dashboard and authorized with one SQL statement (`supabase/create-admin.sql`). The `admin_users` table has no API write access, so nobody can make themselves an admin.
3. **Server-side checks everywhere.** The proxy redirects signed-out visitors away from `/admin`. Every admin page and every Server Action then re-verifies the session with Supabase Auth and the admin role from the database. Client-side state is never trusted.
4. **No secret keys.** The app only uses the publishable key. The service-role / secret key is not needed and must never be added to `NEXT_PUBLIC_*` variables.
5. **Validation.** All input is validated with Zod on the server. Uploads are limited to JPG, PNG and WebP up to 5 MB, by both the app and the storage bucket. Image paths are checked against a strict pattern.
6. **Concurrency.** Booking changes only apply if the product is still in the expected state (`… WHERE status = 'available'`). Product edits use a version number, so two admins can't silently overwrite each other.

## How "instant" updates work

Public pages are cached for speed. Each admin change (product, category, settings) calls `updateTag(...)`, so the next visitor sees the change immediately. Edits made directly in the Supabase table editor bypass this and appear within about an hour. Use the admin panel for day-to-day changes.
