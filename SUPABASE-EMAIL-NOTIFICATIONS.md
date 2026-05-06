# Email Notifications for Contact Form Submissions

When someone submits the contact form on `blueraysl.com`, you'll get an email automatically. ~10 minutes to set up.

**Stack:** Supabase Edge Function → Resend API → your inbox.

---

## 1. Create a Resend account

1. Go to https://resend.com/signup → sign up with your email (use `cjanneh@gmail.com` for now)
2. Verify your email (Resend will send a confirmation link)
3. Once logged in → **API Keys** (left sidebar) → **Create API Key**
   - Name: `blueraysl-website`
   - Permission: **Sending access**
   - Copy the key (`re_...`) — you'll only see it once

> ⚠️ **Sandbox mode limitation:** Until you verify the `blueraysl.com` domain in Resend, you can only:
> - Send FROM `onboarding@resend.dev`
> - Send TO the email you signed up with (probably `cjanneh@gmail.com`)
>
> That's perfect for testing. Once it's working, do step 6 below to remove those limits.

---

## 2. Add the Resend API key as a secret in Supabase

In your Supabase project → **Project Settings** → **Edge Functions** → **Manage secrets** → **Add new secret**:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | `re_...` (paste your key) |
| `NOTIFY_EMAIL` | `cjanneh@gmail.com` (where notifications go) |
| `FROM_EMAIL` | `Blue-Ray Website <onboarding@resend.dev>` |

Save.

---

## 3. Create the Edge Function

In Supabase → **Edge Functions** (left sidebar) → **Deploy a new function**.

- **Name:** `notify-contact-submission`
- **Verify JWT:** **Off** (uncheck) — webhooks don't send a JWT
- Paste the code below into the editor:

```ts
// supabase/functions/notify-contact-submission/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFY_EMAIL   = Deno.env.get('NOTIFY_EMAIL')   || 'info@blueraysl.com'
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL')     || 'Blue-Ray Website <onboarding@resend.dev>'

function escape(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

serve(async (req) => {
  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')

    const payload = await req.json()
    // Supabase webhooks send: { type, table, record, schema, old_record }
    const r = payload?.record
    if (!r) throw new Error('No record in webhook payload')

    const subject = `New Website Inquiry — ${r.service || 'General'} — ${r.name || 'unknown'}`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; color: #111;">
        <div style="background: #ff6b1a; color: #0a0e1a; padding: 18px 24px; border-radius: 6px 6px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">📬 NEW CONTACT FORM SUBMISSION</h2>
        </div>
        <div style="border: 1px solid #eee; border-top: 0; padding: 24px; border-radius: 0 0 6px 6px;">
          <table style="width:100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding:8px 0; color:#666; width:120px;">Name</td><td style="padding:8px 0;"><strong>${escape(r.name)}</strong></td></tr>
            <tr><td style="padding:8px 0; color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${escape(r.email)}">${escape(r.email)}</a></td></tr>
            <tr><td style="padding:8px 0; color:#666;">Phone</td><td style="padding:8px 0;">${escape(r.phone || '—')}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Service</td><td style="padding:8px 0;">${escape(r.service || '—')}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Submitted</td><td style="padding:8px 0;">${escape(r.created_at)}</td></tr>
          </table>
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="margin: 0 0 10px; font-size: 14px; text-transform: uppercase; color: #666; letter-spacing: 0.05em;">Message</h3>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escape(r.message)}</p>
          </div>
          <p style="margin-top:24px; font-size:12px; color:#999;">
            Reply directly to this email to respond to ${escape(r.name)}.
          </p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        reply_to: r.email,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Resend API ${res.status}: ${errBody}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-contact-submission error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

Click **Deploy function**.

---

## 4. Test the function manually first

Still in **Edge Functions** → click the function → **Test** tab. Body:

```json
{
  "type": "INSERT",
  "table": "contact_submissions",
  "schema": "public",
  "record": {
    "id": "test-id",
    "created_at": "2026-05-05T16:00:00Z",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+232123456",
    "service": "Construction",
    "message": "This is a test message"
  }
}
```

Click **Send request**. Check your inbox — within ~10 seconds you should receive the notification email. If not, check the function logs (same page → **Logs** tab) for the error.

---

## 5. Wire the Database Webhook

In Supabase → **Database** → **Webhooks** → **Create a new hook**:

| Field | Value |
|---|---|
| Name | `contact-submission-notification` |
| Table | `public.contact_submissions` |
| Events | ✅ **Insert** only |
| Type | **Supabase Edge Functions** |
| Edge Function | `notify-contact-submission` |
| HTTP Method | POST |
| Headers | _(leave defaults)_ |
| Timeout | 5000 ms |

Click **Create webhook**.

Now go to https://blueraysl.com/contact.html (or local), submit the form for real — you should get the email.

---

## 6. (Recommended, do later) Verify your domain so emails come from blueraysl.com

This makes the emails come from `notifications@blueraysl.com` instead of `onboarding@resend.dev` — looks far more professional and avoids spam filters.

1. In Resend → **Domains** → **Add Domain** → `blueraysl.com`
2. Resend shows you ~3 DNS records (SPF, DKIM, optionally DMARC)
3. Add those records at your DNS provider (Vercel, since you bought the domain there: Vercel → your project → Domains → blueraysl.com → Manage DNS)
4. Back in Resend, click **Verify** — usually works within a few minutes
5. Once verified, update the Supabase secret:

   ```
   FROM_EMAIL = Blue-Ray Website <notifications@blueraysl.com>
   ```

   And update `NOTIFY_EMAIL` to `info@blueraysl.com` since you can now send to any address.

---

## Troubleshooting

**"No email received":**
- Check function logs in Supabase → Edge Functions → `notify-contact-submission` → Logs
- Most common cause: typo in `RESEND_API_KEY` or sending TO an email that isn't your Resend account email (sandbox mode restriction)

**"Webhook didn't fire":**
- Database → Webhooks → check the webhook is enabled
- Click the webhook → **Recent deliveries** to see if it tried and what response it got

**"Resend says domain not verified":**
- You're using a custom FROM address before verifying. Either revert to `onboarding@resend.dev` or finish step 6.

---

## Cost

- **Resend free tier:** 100 emails/day, 3,000/month
- **Supabase Edge Functions free tier:** 500,000 invocations/month
- **Database webhooks:** unlimited on free tier

You'll never come close to those limits with a contact form.
