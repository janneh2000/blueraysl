/**
 * Cloudflare Pages Function — contact form handler.
 *
 * POST /api/contact
 *
 * Replaces the old Supabase insert. Validates the submission, rejects obvious
 * bots, and forwards it by email through Resend.
 *
 * Environment variables (Cloudflare dashboard → Settings → Variables):
 *   RESEND_API_KEY   required to actually send. Without it the endpoint still
 *                    validates and returns a clear "not configured" response,
 *                    and the front end falls back to opening the user's mail app,
 *                    so an enquiry is never silently lost.
 *   CONTACT_TO       where enquiries go. Defaults to info@blueraysl.com.
 *   CONTACT_FROM     verified sender on your Resend domain.
 *                    Defaults to website@blueraysl.com.
 */

const MAX = { name: 120, email: 200, phone: 40, service: 60, message: 5000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// Deliberately permissive: the goal is to catch typos, not to police addresses.
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export async function onRequestPost({ request, env }) {
  let data;
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      data = await request.json();
    } else {
      data = Object.fromEntries(await request.formData());
    }
  } catch {
    return json(400, { ok: false, error: "Could not read the submission." });
  }

  // Honeypot: a real person never fills a field they cannot see.
  if (clean(data.company_website, 100)) {
    return json(200, { ok: true });
  }

  const name = clean(data.name, MAX.name);
  const email = clean(data.email, MAX.email);
  const phone = clean(data.phone, MAX.phone);
  const service = clean(data.service, MAX.service);
  const message = clean(data.message, MAX.message);

  const errors = {};
  if (name.length < 2) errors.name = "Please give your name.";
  if (!looksLikeEmail(email)) errors.email = "Please give a valid email address.";
  if (message.length < 10) errors.message = "Please tell us a little about the project.";
  if (Object.keys(errors).length) return json(422, { ok: false, errors });

  const to = env.CONTACT_TO || "info@blueraysl.com";
  const from = env.CONTACT_FROM || "website@blueraysl.com";

  if (!env.RESEND_API_KEY) {
    return json(503, {
      ok: false,
      configured: false,
      error: "Email delivery is not configured yet.",
    });
  }

  const country = request.headers.get("cf-ipcountry") || "unknown";
  const subject = `Website enquiry — ${service || "General"} — ${name}`;
  const lines = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || "—"}`,
    `About:   ${service || "—"}`,
    `Country: ${country}`,
    "",
    message,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `Blue-Ray Website <${from}>`,
        to: [to],
        reply_to: email,
        subject,
        text: lines,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend rejected the message:", res.status, detail.slice(0, 500));
      return json(502, { ok: false, error: "We could not send that just now." });
    }
  } catch (err) {
    console.error("Resend request failed:", err);
    return json(502, { ok: false, error: "We could not send that just now." });
  }

  return json(200, { ok: true });
}

export function onRequest() {
  return json(405, { ok: false, error: "Use POST." });
}
