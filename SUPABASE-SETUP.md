# Wiring the Contact Form to Supabase

Yes — you can absolutely save "Get In Touch" submissions to Supabase. It's free up to 500 MB of database, which is more than enough for contact form messages.

This guide takes ~10 minutes start to finish.

---

## 1. Create a Supabase project

1. Go to https://supabase.com → sign in with GitHub
2. **New Project**
   - Name: `blueraysl`
   - Database password: make one and save it somewhere
   - Region: pick the one nearest Sierra Leone (e.g. `eu-west-2 / London`)
3. Wait ~2 minutes for it to provision

---

## 2. Create the `contact_submissions` table

In your Supabase project → **SQL Editor** → **New query** → paste and run:

```sql
-- One row per contact form submission
create table public.contact_submissions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  phone        text,
  service      text,
  message      text not null,
  user_agent   text,
  ip_country   text  -- optional, populated by edge functions if you add them later
);

-- Allow ANYONE (anonymous) to INSERT a row, but nothing else.
-- This is safe because no one can SELECT/UPDATE/DELETE without auth.
alter table public.contact_submissions enable row level security;

create policy "Anyone can submit a contact message"
on public.contact_submissions
for insert
to anon
with check (true);
```

Now only authenticated users (i.e. you, in the Supabase dashboard) can read submissions. Visitors can write but not read.

---

## 3. Get your project URL and anon key

In Supabase project → **Settings** → **API**:

- **Project URL** — looks like `https://abcd1234.supabase.co`
- **anon / public key** — looks like `eyJhbGciOi...` (very long)

These are *safe to put in your public website* — that's what they're for. The Row Level Security policy you just set up means the anon key can only INSERT contact submissions, nothing else.

---

## 4. Update the website

### a) Add Supabase config

Create a new file: `js/config.js`

```js
// Public Supabase config — safe to commit, the anon key only allows what your RLS policies allow.
window.BLUERAY_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY-HERE'
};
```

Replace the two values with what you copied from Supabase.

### b) Load Supabase + the config in `contact.html`

Open `contact.html` and find this line near the bottom:

```html
<script src="js/main.js"></script>
```

Replace it with:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script>
<script src="js/main.js"></script>
```

### c) Replace the form-submit handler in `js/main.js`

Open `js/main.js` and find the block near the bottom that starts with:

```js
// Form: just a friendly fake-handler (mailto fallback)
const form = document.querySelector('.contact-form');
```

Replace **the whole block** (everything from that comment to its closing `}` and the final `);`) with this:

```js
  // Contact form → Supabase (with mailto fallback if Supabase fails)
  const form = document.querySelector('.contact-form');
  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.innerHTML : '';

    const sb = (window.supabase && window.BLUERAY_CONFIG)
      ? window.supabase.createClient(
          window.BLUERAY_CONFIG.SUPABASE_URL,
          window.BLUERAY_CONFIG.SUPABASE_ANON_KEY
        )
      : null;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const payload = {
        name: (data.get('name') || '').trim(),
        email: (data.get('email') || '').trim(),
        phone: (data.get('phone') || '').trim() || null,
        service: (data.get('service') || '').trim() || null,
        message: (data.get('message') || '').trim(),
        user_agent: navigator.userAgent
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';
      }

      try {
        if (!sb) throw new Error('Supabase not configured');
        const { error } = await sb.from('contact_submissions').insert(payload);
        if (error) throw error;
        form.innerHTML = `
          <h3 style="margin-bottom:14px;">Thank you — message received.</h3>
          <p class="muted">We've got your details and will reply within one business day.</p>
        `;
      } catch (err) {
        console.error('Submission failed, falling back to mailto:', err);
        // Fallback: open mail app pre-filled, so the user is never stranded
        const subject = encodeURIComponent('Website Inquiry — ' + (payload.service || 'General'));
        const body = encodeURIComponent(
          'Name: ' + payload.name +
          '\nEmail: ' + payload.email +
          '\nPhone: ' + (payload.phone || '') +
          '\nService: ' + (payload.service || '') +
          '\n\nMessage:\n' + payload.message
        );
        window.location.href = 'mailto:info@blueraysl.com?subject=' + subject + '&body=' + body;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
        }
      }
    });
  }
```

### d) Test locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/contact.html
# fill out the form, submit
```

In Supabase → **Table Editor** → `contact_submissions` you should see your test row appear.

### e) Push and Vercel auto-deploys

```bash
git add .
git commit -m "Wire contact form to Supabase"
git push
```

---

## 5. Get notified by email when someone submits

Supabase has a built-in feature for this. In Supabase → **Database** → **Webhooks** (or use a free service like [Zapier](https://zapier.com) → "New row in Supabase" → "Send email"). Or use Supabase's own [Edge Function](https://supabase.com/docs/guides/functions) to trigger an email via [Resend](https://resend.com) (also free up to 100 emails/day).

I can wire that up next when you're ready.

---

## Notes on security

- The anon key in `config.js` is **public by design**. It's the one Supabase recommends shipping to browsers.
- Row Level Security (RLS) is what actually protects your data — without the policy you wrote, nothing inserts/reads. With it, anyone can insert but only authenticated users (you, via Supabase dashboard) can read.
- Don't ever commit the **`service_role` key** (the other one in Supabase Settings → API). That one bypasses RLS and would be a real leak.

## Cost

Free tier covers:
- 500 MB database (~50,000 contact submissions)
- 50,000 monthly auth users
- 5 GB bandwidth

You'll never come close to those limits with a contact form.
