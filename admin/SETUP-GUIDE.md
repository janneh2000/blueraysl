# Blue-Ray Admin Panel — Setup Guide

The admin panel lives at `/admin/` and lets a logged-in administrator:

- 📨 **Read & manage contact form submissions** (with status & notes)
- ⚙️ **Edit phone numbers, address, hours, hero text and home-page stats** — changes appear live on the site
- 🏗 **Add / edit / delete projects** in the gallery (with image upload)
- 📰 **Write news posts** that appear on the new `/news.html` page
- 🔐 **Sign in via email + password OR Google**

This guide takes ~15 minutes from start to finish. Do it once, then your brother can use the panel forever.

---

## 1. Run the SQL migration in Supabase (one-time)

Open your Supabase project → **SQL Editor** → **New query** → paste the contents of [`admin/supabase-migration.sql`](./supabase-migration.sql) → click **Run**.

This will:
- Add `status` / `admin_notes` / `replied_at` columns to your existing `contact_submissions` table
- Create new tables: `site_settings`, `projects`, `news_posts`
- Create a Storage bucket named `site-images` for uploaded photos
- Set up Row Level Security so only authenticated admins can write

You should see `Success. No rows returned.` Refresh the **Table Editor** sidebar — you'll see the new tables listed.

---

## 2. Create your first admin user

Two options. Pick whichever you prefer.

### Option A — Email + password (simplest)

In Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.

- Email: `cjanneh@gmail.com` (or any email you'll remember)
- Password: a strong one — **save it somewhere**
- ✅ **Auto Confirm User** — toggle this ON (otherwise you'll need to click an email link first)

Click **Create user**. Done — that account can now log in.

To add your brother later, repeat the same steps with his email/password.

### Option B — Google sign-in (also enable Option A first as a fallback)

This requires creating a Google Cloud project. Worth it if you want one-click sign-in.

1. Go to https://console.cloud.google.com/ → create a project (any name, e.g. `blueraysl-admin`)
2. **APIs & Services** → **OAuth consent screen** → choose **External** → fill in app name, your email — that's enough for testing
3. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID** → **Web application**
   - **Authorized JavaScript origins:** add `https://blueraysl.com`, `https://blueraysl.vercel.app`, and `http://localhost:8000`
   - **Authorized redirect URIs:** add `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback` (find your Supabase project URL under Settings → API)
4. Copy the **Client ID** and **Client secret**
5. In Supabase → **Authentication** → **Providers** → enable **Google** → paste both values → save

Now the **"Continue with Google"** button on the login page will work. Each admin still needs to be created in **Authentication → Users** first (Google sign-in only works for already-allowed users — just add them with the email they'll use to sign in).

---

## 3. Log in

Open `https://blueraysl.com/admin/login.html` (or `https://blueraysl.vercel.app/admin/login.html` until your domain is set up).

Sign in with the credentials you just created. You should land on the dashboard with submission counts.

---

## 4. Try each feature once

### Submissions inbox
- Open **Submissions** → you'll see all your existing test submissions
- Click any one → drawer opens with full details
- Click **"Mark replied"** or **"Archive"** → status updates instantly
- The **"✉ Reply by email"** button opens your email app with a pre-filled draft
- Status badges (new / replied / archived) show on the dashboard tiles too

### Settings
- Open **Settings** → edit any phone number, address, hours, stats or hero text
- Click **💾 Save changes** → toast confirms
- Open the public site in another tab → changes are visible after refresh

### Projects
- Open **Projects** → click **+ New project**
- Fill in title, caption, category, drag in an image (5 MB max), save
- Open `/projects.html` on the public site → your new project appears in the gallery

### News
- Open **News** → **+ New post**
- Type a title — the URL slug auto-fills as you type
- Add an excerpt and body, optional cover image
- Set **Status: Published** → save
- Visit `/news.html` → your post is live, click it to see the full article at `/news-post.html?slug=…`

---

## 5. About fallback content

Even if Supabase is unreachable, the **public site never breaks**:
- Phone numbers, address etc. show their hardcoded HTML values
- Projects gallery shows the original 22 hardcoded entries
- News page shows "no posts yet"

This is intentional — Supabase is an enhancement, not a hard dependency.

---

## 6. File map

```
admin/
├── login.html                ← /admin/login.html
├── index.html                ← /admin/  (dashboard)
├── submissions.html
├── settings.html
├── projects.html             ← project CRUD with image upload
├── news.html                 ← news post CRUD
├── supabase-migration.sql    ← run this once in Supabase SQL Editor
├── SETUP-GUIDE.md            ← this file
├── css/admin.css             ← admin-only styling
└── js/admin.js               ← shared auth + helpers

js/
├── config.js                 ← Supabase URL + anon key (already exists)
├── main.js                   ← public site interactivity
└── site-dynamic.js           ← NEW: fetches settings/projects/news on every page

news.html                     ← public news listing
news-post.html                ← public news detail (?slug=…)
```

---

## 7. Things you'll commonly want to do

### Add another admin user
Supabase → **Authentication** → **Users** → **Add user** → done. They can log in immediately.

### Change someone's password
Supabase → **Authentication** → **Users** → click the user → **Send password recovery** (email link) or directly set a new one.

### Look at submissions in raw form
Supabase → **Table Editor** → `contact_submissions`. The admin panel is a friendlier UI for this.

### Roll back a settings change
Open the admin **Settings** page and re-type the previous value. (Settings don't have automatic version history.)

### Permanent backup of submissions
Supabase → **Table Editor** → `contact_submissions` → **Export to CSV**. Do this monthly.

---

## 8. Security notes

- The Supabase anon key in `js/config.js` is **public on purpose** — that's how Supabase works. Row Level Security policies in the migration ensure anonymous visitors can only INSERT contact submissions and only READ published projects/news/settings. Nothing else.
- The admin panel doesn't have any "secret URL" — anyone can visit `/admin/login.html` and see the login page. They just can't get past it without valid credentials.
- Use a **strong password** for every admin account. Aim for 16+ characters.
- Don't share the `service_role` key from Supabase Settings → API. That one bypasses RLS.
- The admin panel is excluded from search engine indexing via `robots.txt`.

---

## 9. What's NOT in the admin (and is therefore still a code change)

These would need a developer to update via GitHub:

- The 4 service descriptions on the Services page
- The Mining Operations gallery on the Services page
- The 6 regional cities and their order
- The Why-Choose-Us / values lists
- The leadership names on the About page
- The footer text and partners list

If your brother needs any of these changed, send the request and I'll update them and push. Or you can edit them directly in the HTML and push to GitHub yourself.

---

## 10. Troubleshooting

**"Sign-in failed: Invalid login credentials"**
The user doesn't exist or the password is wrong. Check Supabase → Auth → Users.

**"Sign-in failed: Email not confirmed"**
You forgot to toggle "Auto Confirm User" when creating the account. Either send a confirmation link from Supabase, or just delete and recreate the user with auto-confirm ON.

**"Continue with Google" button does nothing / shows an error**
Google provider isn't enabled in Supabase, or the OAuth redirect URI doesn't match. Re-check Step 2 → Option B.

**Public site still shows old phone number after I changed settings**
Hard-refresh the public page (`Cmd+Shift+R` on Mac). Browsers cache aggressively. Vercel sometimes caches at the CDN — give it 30 seconds.

**Image upload fails: "new row violates row-level security policy"**
You're logged out, or the migration's storage policies didn't apply. Re-run `admin/supabase-migration.sql`.

**Submissions inbox is empty even though emails arrive**
Make sure you're authenticated (you should see your email in the bottom-left of the sidebar). If RLS denies the read, no rows come back. Re-run the migration.

---

When you're stuck, share the exact error message and I'll debug it with you.
