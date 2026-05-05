# Blue-Ray Mining & Construction Co. (SL) Ltd. — Website

Official website for **Blue-Ray (SL) Ltd.** — an indigenous Sierra Leonean construction, mining and engineering company.

🌍 **Live:** https://blueraysl.com(for now we use this: https://blueraysl.vercel.app/)

## Stack

- Plain HTML, CSS, and vanilla JavaScript — no build step
- Self-contained: drop the folder onto any static host
- ~7 MB total, including 26 project photos
- Hosted on [Vercel](https://vercel.com), domain managed at Vercel

## Pages

| Page | What's on it |
|---|---|
| `index.html` | Landing — hero, stats, services overview, featured projects, partners, CTA |
| `about.html` | Company story, core values, leadership, government clients, partners |
| `services.html` | Construction · Mining · Engineering & Surveys · Supplies (+ delivery process) |
| `projects.html` | Filterable gallery with lightbox (Roads · Bridges · Buildings · Industrial) |
| `contact.html` | Contact info, enquiry form, office map |

## Local preview

```bash
# Easiest: just double-click index.html

# Or run a tiny dev server:
python3 -m http.server 8000
# → open http://localhost:8000
```

## Deploy to Vercel

The fastest way once this repo is on GitHub:

1. Go to https://vercel.com/new
2. Import this repo
3. **Framework Preset:** Other (this is plain static HTML)
4. **Root Directory:** `./` (default)
5. **Build Command:** _(leave empty)_
6. **Output Directory:** `./` (default)
7. Click **Deploy**

You'll get a `blueraysl.vercel.app` URL in 30 seconds.

### Connect the custom domain `blueraysl.com`

1. In Vercel → your project → **Settings** → **Domains**
2. Click **Buy** (or **Add** if you bought it elsewhere)
3. If you buy through Vercel: DNS, HTTPS and renewal are handled automatically
4. If you bought elsewhere: add the records Vercel shows you at your registrar

## Editing without re-deploying every time

Vercel auto-deploys on every push to `main`. So:

```bash
# Make a change, e.g. update a phone number
git add .
git commit -m "Update phone number"
git push
# → live in ~30 seconds
```

## Common tweaks

| What to change | Where to find it |
|---|---|
| Phone numbers / emails | Search across `*.html` for `+232-32-888888` or `info@blueraysl.com` |
| Hero headline | `index.html`, line ~54 |
| Stats numbers | `index.html`, the `data-count="..."` attributes |
| Project captions | `projects.html`, inside each `.project-card` |
| Add a new project | Copy any `.project-card` block, swap image + caption |
| Colours / fonts | `css/style.css`, top of file (`:root` block) |

## Photos

All 26 project photos live in `images/projects/`. Originals were extracted from the company profile doc and resized for web. Replace any of them — keep the same filename — to update the site.

## Contact form

Currently the contact form opens the user's email app pre-filled (`mailto:`). To collect submissions in a database instead, see `SUPABASE-SETUP.md`.

## License

© Blue-Ray (SL) Ltd. All content and project photos are property of the company.
