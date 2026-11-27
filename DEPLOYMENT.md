# Deployment Guide (for beginners)

This guide takes you from "code on my computer" to "live website on my own domain". You don't need any previous experience. Follow the steps in order. Total time is about **60–90 minutes** the first time.

You will use three free online services:

| Service | What it does for you | Website |
| --- | --- | --- |
| **Supabase** | Stores your products, categories, settings and images. Handles the admin login. | https://supabase.com |
| **GitHub** | Stores your website's code online. Vercel reads it from here. | https://github.com |
| **Vercel** | Runs your website on the internet. | https://vercel.com |

> **About Vercel plans:** Vercel's free *Hobby* plan is meant for personal, non-commercial projects. For a business website, Vercel's terms expect the paid *Pro* plan. You can start on Hobby to test everything, then upgrade before launch. Supabase's free plan is fine to start with.

---

## Contents

1. [What you need before starting](#1-what-you-need-before-starting)
2. [Create your Supabase project](#2-create-your-supabase-project)
3. [Set up the database (run the SQL files)](#3-set-up-the-database-run-the-sql-files)
4. [Check the image storage bucket](#4-check-the-image-storage-bucket)
5. [Turn off public sign-ups](#5-turn-off-public-sign-ups)
6. [Create your admin account](#6-create-your-admin-account)
7. [Copy your Supabase keys](#7-copy-your-supabase-keys)
8. [(Optional) Run the website on your computer](#8-optional-run-the-website-on-your-computer)
9. [Upload the code to GitHub](#9-upload-the-code-to-github)
10. [Deploy on Vercel](#10-deploy-on-vercel)
11. [Production environment variables](#11-production-environment-variables)
12. [First login and setup](#12-first-login-and-setup)
13. [Connect your own domain](#13-connect-your-own-domain)
14. [Test everything (launch checklist)](#14-test-everything-launch-checklist)
15. [Daily use: bookings and orders](#15-daily-use-bookings-and-orders)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. What you need before starting

- A computer with internet access.
- An email address for creating accounts.
- **Node.js** (only needed for step 8 — running the site on your computer). Download the **LTS** version from https://nodejs.org and install it with the default options.
- **Git** (needed for step 9). Download from https://git-scm.com and install with the default options. *(Alternative: GitHub Desktop, explained in step 9.)*

Create free accounts on **Supabase**, **GitHub** and **Vercel**. Tip: on Supabase and Vercel, choose **"Continue with GitHub"**. This links the accounts and saves time.

---

## 2. Create your Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Fill in:
   - **Name:** `abdullah-imported-goods`
   - **Database password:** click **Generate a password**, then **save it somewhere safe** (for example a password manager). You will rarely need it, but keep it.
   - **Region:** choose the one closest to Pakistan. **South Asia (Mumbai)** is usually best.
3. Click **Create new project** and wait 1–2 minutes until it says the project is ready.

---

## 3. Set up the database (run the SQL files)

The folder `supabase/migrations/` contains **six** files. Each one is a set of instructions that creates part of the database. Run them **in this exact order**:

| Order | File | What it creates |
| --- | --- | --- |
| 1 | `20261125000000_initial_schema.sql` | Tables, automatic product IDs (AIG-001…), search |
| 2 | `20261125000100_security_rls.sql` | Security rules (who can read or change what) |
| 3 | `20261125000200_storage.sql` | The image storage bucket and its security rules |
| 4 | `20261125000300_default_categories.sql` | Starter categories (Electronics, Kitchen Items, …) |
| 5 | `20261126000000_visitor_analytics.sql` | Visitor statistics for **Admin → Visitors** (anonymous visit counting) |
| 6 | `20261127000000_likes_orders_notifications.sql` | Product likes, cash-on-delivery orders, admin notifications |

For **each file**:

1. In Supabase, open **SQL Editor** in the left menu and click **New query** (or the **+** button).
2. On your computer, open the `.sql` file with Notepad (right-click → *Open with* → *Notepad*). Press **Ctrl+A** to select everything, then **Ctrl+C** to copy.
3. Paste it into the Supabase SQL editor (**Ctrl+V**) and click **Run** (or press **Ctrl+Enter**).
4. You should see **"Success. No rows returned"**. Then do the next file.

> If Supabase shows a warning like *"This query has destructive operations"*, that's normal. The files safely replace their own security rules. Click **Run this query** to confirm.
>
> Running a file a second time is safe. It won't duplicate anything.

**Using the Supabase CLI instead (advanced, optional):** if you're comfortable with a terminal, run `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>`, then `npx supabase db push` from the project folder. This runs all six files for you.

---

## 4. Check the image storage bucket

File 3 created a storage "bucket" (a folder in the cloud) for product photos.

1. In Supabase, open **Storage** in the left menu.
2. You should see a bucket named **`product-images`** marked **Public**.

**If the bucket is missing** (for example, file 3 showed an error):

1. Click **New bucket**.
2. **Name:** `product-images` (exactly like this).
3. Turn **Public bucket** ON.
4. Open the extra settings. Set **Restrict file size** to `5 MB` and **Allowed MIME types** to `image/jpeg, image/png, image/webp`.
5. Click **Save**. Then run file 3 again in the SQL Editor so the security rules are added.

> "Public" only means people can **view** images through their link. Only your admin account can upload, replace or delete images.

---

## 5. Turn off public sign-ups

Nobody should be able to create an account on your website.

1. In Supabase, go to **Authentication** → **Sign In / Providers** (on some versions: *Authentication → Providers* or *Settings*).
2. Find **"Allow new users to sign up"** and turn it **OFF**. Click **Save**.
3. Make sure the **Email** provider is enabled. It is enabled by default.

> Even if sign-ups were left on, a stranger's account would still have **no access**. Only accounts you authorize in step 6 can use the admin panel. Turning sign-ups off is an extra layer of safety.

---

## 6. Create your admin account

**a) Create the user**

1. In Supabase, go to **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter the email you will log in with and a **strong password** (12+ characters, mix of letters and numbers).
4. Tick **Auto Confirm User**, then click **Create user**.

**b) Make that user an admin**

1. Open **SQL Editor** → **New query**.
2. Open the file `supabase/create-admin.sql` from the project, copy everything and paste it.
3. On the line `where lower(email) = lower('owner@example.com')`, replace `owner@example.com` with the email you just used. Keep the quote marks.
4. Click **Run**. You should see **one row** returned (your user ID).

> **No row returned?** The email doesn't exactly match the user in *Authentication → Users*. Check the spelling and run it again.
>
> **Adding another admin later:** repeat steps 6a and 6b with the new person's email.
> **Removing an admin:** see the commented instructions at the bottom of `create-admin.sql`.

---

## 7. Copy your Supabase keys

The website needs two values to connect to your database.

1. In Supabase, click **Project Settings** (gear icon) → **API Keys**. You can also use the **Connect** button at the top of the dashboard.
2. Copy these two values into a text file for the next steps:
   - **Project URL**, which looks like `https://abcdefghijklmnop.supabase.co`. It's under *Project Settings → Data API*, or in the *Connect* dialog.
   - **Publishable key**, which starts with `sb_publishable_...`. Older projects show an **anon public** key instead, which also works.

> **Never use the "secret" key or the "service_role" key** for this website. It isn't needed, and it gives full access to your database.

---

## 8. (Optional) Run the website on your computer

This step is optional. It lets you try everything before going live.

1. Open the project folder `abdullah-imported-goods` in File Explorer.
2. Click the address bar, type `cmd` and press **Enter**. A black terminal window opens in that folder.
3. Install the website's building blocks (takes 1–3 minutes):
   ```bash
   npm install
   ```
4. Create your settings file:
   ```bash
   copy .env.example .env.local
   ```
   *(On Mac/Linux: `cp .env.example .env.local`)*
5. Open `.env.local` in Notepad and fill in the values from step 7:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
   Save the file.
6. Start the website:
   ```bash
   npm run dev
   ```
7. Open http://localhost:3000 in your browser. The admin panel is at http://localhost:3000/admin.
8. To stop the website, click the terminal window and press **Ctrl+C**.

> `.env.local` contains your keys and is **never uploaded to GitHub**. The project's `.gitignore` file prevents that.

---

## 9. Upload the code to GitHub

**a) Create an empty repository on GitHub**

1. Go to https://github.com/new.
2. **Repository name:** `abdullah-imported-goods`.
3. Choose **Private** (recommended).
4. **Do not** tick "Add a README", ".gitignore" or "license". The project already has them.
5. Click **Create repository**. Keep the page open. It shows your repository address, like `https://github.com/YOUR-USERNAME/abdullah-imported-goods.git`.

**b) Upload the code (Option 1 — terminal)**

Open a terminal in the project folder (see step 8.2) and run these commands one at a time. Replace `YOUR-USERNAME` with your GitHub username.

```bash
git add -A
git commit -m "Abdullah Imported Goods catalog"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/abdullah-imported-goods.git
git push -u origin main
```

- If Git asks who you are, run these two commands (with your details), then repeat `git commit`:
  `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
- If a GitHub login window appears, sign in and allow access.
- If `git remote add` says *remote origin already exists*, run `git remote set-url origin https://github.com/YOUR-USERNAME/abdullah-imported-goods.git` instead.

**b) Upload the code (Option 2 — GitHub Desktop, no commands)**

1. Install https://desktop.github.com and sign in.
2. **File → Add local repository…** → choose the `abdullah-imported-goods` folder.
3. Type a summary such as "Abdullah Imported Goods catalog" and click **Commit to master** (or *main*).
4. Click **Publish repository**. Keep **"Keep this code private"** ticked, then click **Publish**.

Refresh your GitHub page. You should see the project files. You should **not** see `.env.local` or `node_modules`.

---

## 10. Deploy on Vercel

1. Go to https://vercel.com/new.
2. Under **Import Git Repository**, find `abdullah-imported-goods` and click **Import**. If you don't see it, click *Adjust GitHub App Permissions* and allow access to the repository.
3. **Framework Preset:** should automatically say **Next.js**. Leave the build settings as they are.
4. Open **Environment Variables** and add these (one at a time: *Key*, then *Value*, then **Add**):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from step 7 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key from step 7 |
   | `NEXT_PUBLIC_SITE_URL` | leave empty for now. You'll set it in step 11. |

5. Click **Deploy**. Wait 2–4 minutes. When you see **Congratulations**, click the preview to open your live website. It's at an address like `https://abdullah-imported-goods.vercel.app`.

**Recommended:** in Vercel, go to **Project → Settings → Functions** and set the **Function Region** to the same area as your Supabase project, for example **Mumbai (bom1)**. Pages load faster when the server is close to the database. Then redeploy (see step 11).

---

## 11. Production environment variables

Variables that start with `NEXT_PUBLIC_` are built into the website when it's deployed. **Every time you change one, you must redeploy.**

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Set **`NEXT_PUBLIC_SITE_URL`** to your website's real address, **without a slash at the end**:
   - for now: `https://abdullah-imported-goods.vercel.app` (use your actual Vercel address)
   - after step 13: `https://www.yourdomain.com`
3. Make sure all three variables are enabled for **Production** (and *Preview* if you use preview deployments).
4. Redeploy: go to **Deployments**, click the **⋯** menu on the latest deployment, then **Redeploy**.

This address is used in the product links inside WhatsApp messages, the sitemap, and social-media previews.

| Variable | Required? | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://abcdefghijklmnop.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | `sb_publishable_...` |
| `NEXT_PUBLIC_SITE_URL` | Strongly recommended | `https://www.yourdomain.com` |
| `VAPID_PRIVATE_KEY` | For phone notifications | a 43-character key (see *Phone notifications* below) |

> Do **not** add the Supabase secret / service_role key anywhere. This app doesn't use it.

### Phone notifications (new orders and likes)

The admin panel always shows new orders and likes in the **bell** at the top. To also get an alert on your **phone** when the website is closed, the server needs one secret key:

1. Create the key once. On your computer, open a terminal in the project folder and run:
   ```
   npx web-push generate-vapid-keys
   ```
   Copy the **Private Key** (a line of about 43 letters and numbers). You can ignore the Public Key; the website works it out from the private one.
2. Vercel → your project → **Settings** → **Environment Variables** → add:
   - Name: `VAPID_PRIVATE_KEY` (do **not** add `NEXT_PUBLIC_` in front: this one is secret)
   - Value: the private key
   - Environments: **Production** (and Preview if you use it)
3. Redeploy (Deployments → ⋯ → **Redeploy**).
4. On your phone, open `/admin` → **Settings** → **Phone notifications** → **Turn on notifications on this device** and allow notifications. Tap **Send test notification** to check.
   - **Android:** works in Chrome.
   - **iPhone/iPad (iOS 16.4 or newer):** first open the website in Safari → Share → **Add to Home Screen**, open it from the new icon, sign in, then turn notifications on.
5. Repeat step 4 on every phone or computer that should get alerts. Each device can choose **New orders** and/or **New likes**.

> Keep the private key secret. If you ever change it, turn notifications off and on again on each device.

---

## 12. First login and setup

1. Open `https://YOUR-SITE/admin` (for example `https://abdullah-imported-goods.vercel.app/admin`).
2. Sign in with the email and password from step 6.
3. Go to **Settings** and fill in:
   - **WhatsApp number** in international format **without +**, for example `923001234567`. You can also type `0300 1234567` and it's converted automatically. Click **Test link** to check that it opens your WhatsApp chat.
   - Business name, logo (optional), welcome text, phone, email, address and business hours.
   - Click **Save settings**.
4. Go to **Categories** and rename, add or delete categories to match your stock.
5. Go to **Add Product**: upload a photo, enter the name, price, category and description, then click **Publish product**.
6. Open your website's homepage. Your product appears with **Book on WhatsApp** and **Inquire on WhatsApp** buttons.

**To change your password later:** Admin → **Settings** → *Change your password*.
**If you forget your password:** create a new admin user (step 6) and remove the old one. Another admin can also create one for you.

---

## 13. Connect your own domain

You can buy a domain (for example `abdullahimports.pk` or `abdullahimports.com`) from any registrar, such as a PKNIC-approved registrar for `.pk`, Namecheap, or GoDaddy.

1. Vercel → your project → **Settings** → **Domains**.
2. Type your domain (for example `abdullahimports.com`) and click **Add**. Vercel usually suggests adding both `abdullahimports.com` and `www.abdullahimports.com`. Accept that, and choose which one is the main address. `www` is a good choice.
3. Vercel then shows the **DNS records** to create. They are usually:
   - an **A** record for the main domain (`@`) pointing to the IP address Vercel shows, and
   - a **CNAME** record for `www` pointing to the value Vercel shows.

   **Always copy the exact values shown on your Vercel screen.** They can change over time.
4. Log in to your domain registrar, open **DNS settings** / **Manage DNS**, add those records, and save. Delete any old `A` or `CNAME` records for `@` or `www` that point elsewhere.
5. Back in Vercel, wait until the domain shows **Valid Configuration**. This usually takes a few minutes, but can take up to 48 hours. HTTPS (the padlock) is set up automatically.
6. Update **`NEXT_PUBLIC_SITE_URL`** to your new address (for example `https://www.abdullahimports.com`) and **redeploy** (step 11).
7. Optional: in Supabase → **Authentication** → **URL Configuration**, set **Site URL** to the same address.

---

## 14. Test everything (launch checklist)

Use your phone for most of these. That's how your customers will see the site.

- [ ] **Homepage** loads on mobile with no sideways scrolling. Products show 2 per row on a phone.
- [ ] **Search** for a product name, then for its product ID (for example `AIG-001`). Try the category filter, "Available only", "New arrivals" and the sort options.
- [ ] **Product page**: tap **Book on WhatsApp**. WhatsApp opens with the booking message, product name, ID, price and link. Tap **Inquire on WhatsApp** and check the different message.
- [ ] **Admin security**: open a private/incognito window and go to `/admin`. You should be sent to the login page. A wrong password should be rejected.
- [ ] **Image upload**: add a product with a large phone photo. You'll see the preview and progress bar, and the photo is compressed automatically.
- [ ] **Publish / Unpublish**: unpublish a product. It disappears from the website (refresh the page). Publish it again and it comes back.
- [ ] **Booking**: in Admin → Products, tap **Mark Booked**. On the website the product shows **BOOKED**, the booking button is disabled, and "Ask about future stock" appears. Tap **Mark Available** and it returns to normal.
- [ ] **Delete**: deleting a product asks for confirmation first.
- [ ] **Share / Copy link** buttons work on the product page.
- [ ] **Install as app**: Android Chrome, menu (⋮) → *Add to Home screen* / *Install app*. iPhone Safari, **Share** → *Add to Home Screen*.
- [ ] Check `https://YOUR-SITE/sitemap.xml` and `https://YOUR-SITE/robots.txt` open.

Optional: add your site to **Google Search Console** (https://search.google.com/search-console) and submit `https://YOUR-SITE/sitemap.xml` so Google finds your products faster.

---

## 15. Daily use: bookings and orders

1. A customer taps **Book on WhatsApp**. You receive a message with the product name, **Product ID** and link.
2. Open **`/admin` → Products** on your phone and search the product ID (for example `AIG-014`).
3. Tap **Mark Booked** and confirm. Every customer now sees **BOOKED** and can no longer book it.
4. If the booking is cancelled, tap **Mark Available**.

If two admins tap at the same time, only the first change is applied. The second admin sees a message that the product was already updated.

### Cash-on-delivery orders

Every product that is **Available** has an **Order now · Cash on Delivery** button. The customer enters their name, WhatsApp number, delivery address and quantity, presses **Place order**, and gets an order number (for example `ORD-0007`).

1. You get a notification (bell in the admin panel, and on your phone if it's turned on).
2. Open **`/admin` → Orders** and tap the order. You see the customer's name, WhatsApp number, address, note, the product and the total to collect.
3. Tap **Message customer on WhatsApp**. A ready-made message opens with the order details. Confirm with the customer.
4. Tap **Confirm order**, later **Mark as shipped**, then **Mark as delivered**. The WhatsApp message changes to match each step.
5. If you only have one piece, tap **Mark … as Booked on the website** so nobody else can order it.
6. **Cancel order** keeps it in the list as Cancelled (you can reopen it). Cancelled or delivered orders can be deleted.

Use **Private note** for courier names, tracking numbers or delivery times. Only admins see it. To stop spam, the website accepts at most 5 orders per WhatsApp number per hour.

### Likes

Customers can tap **♡ Like** on any product (one like per phone or computer, tap again to unlike). You see the like count of each product in **Products**, and **Total likes** and **Most liked** on the dashboard. You're notified once per new like.

### Seeing who visits your website

Open **`/admin` → Visitors** (the dashboard also shows a small summary):

- **Active right now**: how many people are using the website at this moment, and which pages or products they are looking at. It updates by itself every 15 seconds.
- **Visitors today** and **page views today**.
- For the **last 7, 30 or 90 days**: visitors, visits, page views, new visitors, average time on the site, a chart of visitors per day, your **most viewed products**, phones vs. computers, and where visitors came from (Google, Facebook, …). Links opened inside WhatsApp chats usually show as **Direct**.

Visits are counted anonymously. No names, phone numbers or IP addresses are stored, and history older than 90 days is deleted automatically. Search engines, bots, and **your own visits** are not counted. Any phone or computer where you have opened the admin panel is skipped.

**Hide vs. delete:** use **Unpublish** to hide a product temporarily (for example, out of stock for a while). Use **Delete** only when the product will never come back. Deleting also removes its photo.

---

## 16. Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| Website says **"We couldn't load products right now"** | The database isn't reachable or the SQL files weren't run. Check step 3 (all 6 files, in order) and that the Vercel environment variables match step 7. Redeploy after fixing variables. |
| **Admin → Visitors** says *"One more step to turn on visitor statistics"* | File 5 (`20261126000000_visitor_analytics.sql`) hasn't been run yet. Run it in the SQL Editor (step 3), then reload the page. |
| Visitors stays at **0** when you open the website yourself | That's on purpose: devices where you've opened the admin panel are not counted. Test with a phone that has never opened `/admin`. |
| **Orders** says *"One more step to turn on orders and likes"*, or customers see *"Online ordering is being set up"* | File 6 (`20261127000000_likes_orders_notifications.sql`) hasn't been run yet. Run it in the SQL Editor (step 3). |
| **Phone notifications** says it needs a setup on Vercel | `VAPID_PRIVATE_KEY` is missing. Add it (step 11, *Phone notifications*) and redeploy. |
| Phone notifications don't arrive | Tap **Send test notification** in Settings. If it fails, turn notifications off and on again on that device. Make sure the phone allows notifications for the browser (Android) or the Home Screen app (iPhone). |
| Website works but **no products** show | Products are saved as **Draft** or none are published. In Admin → Products, filter by "Drafts only" and publish them. |
| Login says **"Incorrect email or password"** | Check for typing mistakes. Make sure the user exists in Supabase → Authentication → Users. Run the check query below. |
| Login says **"email is not confirmed"** | The user was created without **Auto Confirm User**. Run the "confirm" query below, or delete the user and create it again with the box ticked. |
| Login says **"not an admin yet"** | The password is right, but the account isn't an admin. Run `create-admin.sql` with the exact email (step 6b). |
| Login says **"Supabase is not configured"** | The environment variables are missing. Add them in Vercel (step 10) or `.env.local` (step 8), then redeploy or restart. |
| **"Too many sign-in attempts"** | Supabase temporarily blocks repeated wrong passwords. Wait a few minutes. |
| Image upload fails with **"not allowed"** | File 3 (storage) wasn't run, or you aren't signed in as an admin. Run file 3 again (step 4) and sign in again. |
| Image upload fails with **"type"** or **"too large"** | Use JPG, PNG or WebP. Photos are compressed automatically, but the final file must be under 5 MB. |
| Product **images don't appear** (broken image icons) | `NEXT_PUBLIC_SUPABASE_URL` in Vercel doesn't match your Supabase project, or you changed it without redeploying. Fix it and redeploy. |
| Images fail with **"url parameter is not allowed"** (self-hosting only) | The server was started without `NEXT_PUBLIC_SUPABASE_URL` in its environment. The variables must be set when you run `npm run build` *and* `npm start`. Vercel does this automatically. |
| **WhatsApp buttons are missing** | The WhatsApp number isn't set. Go to Admin → Settings (the dashboard also shows a yellow warning). |
| WhatsApp message link shows **vercel.app** instead of your domain | Set `NEXT_PUBLIC_SITE_URL` to your domain and redeploy (step 11). |
| A change made in the **Supabase Table Editor** doesn't appear on the website | Direct database edits skip the website's instant refresh and can take up to an hour to appear. Make changes in the admin panel instead, or redeploy to refresh everything at once. |
| Vercel build fails | Open the failed deployment in Vercel and read the red error lines. Most often an environment variable is misspelled. The names must match step 10 exactly. |
| Domain shows **"Invalid Configuration"** in Vercel | DNS records are missing or wrong. Compare them carefully with what Vercel shows (step 13) and wait up to 48 hours. |
| Supabase says the project is **paused** | Free Supabase projects can pause after a long period of inactivity. Open the Supabase dashboard and click **Restore project**. |
| "Install app" option doesn't appear | It only works on the live HTTPS site, not on `localhost`. On iPhone use Safari → Share → *Add to Home Screen*. |

### Admin login problems: check and fix with SQL

Run these in Supabase → **SQL Editor**. Replace the email with yours.

**1. Check your admin account.** You should see your email with `true` in both columns:
```sql
select u.email,
       u.email_confirmed_at is not null as email_confirmed,
       au.user_id is not null          as is_admin
from auth.users u
left join public.admin_users au on au.user_id = u.id;
```
- No row with your email: the user doesn't exist. Create it (step 6a).
- `email_confirmed` is `false`: run query 2.
- `is_admin` is `false`: run `create-admin.sql` (step 6b).

**2. Confirm the email:**
```sql
update auth.users
set email_confirmed_at = now()
where lower(email) = lower('you@example.com') and email_confirmed_at is null;
```

**3. Forgot the password? Set a new one:**
```sql
update auth.users
set encrypted_password = extensions.crypt('Your-New-Password-123', extensions.gen_salt('bf'))
where lower(email) = lower('you@example.com');
```
Then sign in with the new password, and change it again from Admin → Settings if you like.

### Updating the website later

After changing code on your computer, run:

```bash
git add -A
git commit -m "Describe your change"
git push
```

Vercel automatically deploys every push to GitHub within a few minutes.

### Changing the database structure later

Create a new `.sql` file in `supabase/migrations/` with a later date in its name, and run it in the SQL Editor. **Never edit files that you've already run.** If you change tables, regenerate `src/types/database.ts` (see the comment at the top of that file).
