# Blue-Ray Mining & Construction Co. (SL) Ltd. — Website

Official website for **Blue-Ray (SL) Ltd.** — an indigenous Sierra Leonean
construction, mining and engineering company.

**Live:** https://blueraysl.com · hosted on Cloudflare Pages

## How it works

Static HTML, generated from templates. No framework, no runtime dependencies,
no database.

```
src/layouts/base.html   the page shell — nav, footer, <head>, in ONE place
src/pages/*.html        page content + a <!--meta--> block for title/description
src/data/*.json         site details, minerals, projects, achievements
scripts/build.mjs       renders src/pages -> dist/   (plain Node, zero deps)
scripts/optimize-media.py  photo + video pipeline
functions/api/contact.js   Cloudflare Pages Function behind the contact form
media/src/              original photos (video originals are gitignored)
assets/                 generated web media — committed, do not hand-edit
dist/                   build output — gitignored
```

Editing a phone number, a nav item or the footer means editing one file, not seven.

## Commands

```bash
npm run build     # render dist/
npm run serve     # build, then serve dist/ at http://localhost:8000
npm run media     # re-run the image/video pipeline after adding source media
```

`npm run media` needs Python with Pillow, plus ffmpeg. It writes `assets/` and
`src/data/media-index.json`, which the build reads to generate `<picture>`
markup. Commit both.

## Adding photos or video

1. Drop the originals in `media/src/<Category Name>/`.
2. Add an entry to `src/data/media-sources.json` (slug, category, optional crop
   or trim).
3. Add the slug plus a caption and alt text to `src/data/minerals.json` or
   `src/data/projects.json`.
4. `npm run media && npm run build`.

Images come out as AVIF + WebP + JPEG at 400/800/1200px, never upscaled past the
source. Videos come out as H.264 MP4 capped at 720px wide with a poster frame.

## Deploying

Cloudflare Pages builds on every push to `main`:

- **Build command:** `node scripts/build.mjs`
- **Output directory:** `dist`
- **Functions:** picked up automatically from `functions/`

`_headers` sets caching and security headers. `_redirects` covers the retired
pages from the previous version of the site.

**Cache busting.** The build writes `css/style.<hash>.css` and
`js/*.<hash>.js` and rewrites the references, so CSS and JS are cached
immutably and a change always reaches browsers on the next load. Media under
`assets/` is named by slug and width rather than content, and is also cached
immutably — so **to replace a photo, give it a new slug** in
`src/data/media-sources.json`. Overwriting one in place would leave browsers
showing the old image for up to a year.

### Contact form

`functions/api/contact.js` emails submissions via Resend. Set these in
Cloudflare → Pages → Settings → Variables:

| Variable | Needed | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Without it the endpoint returns 503 and the form falls back to opening the visitor's mail app, so nothing is lost. |
| `CONTACT_TO` | no | Defaults to `info@blueraysl.com`. |
| `CONTACT_FROM` | no | Must be a verified sender on your Resend domain. Defaults to `website@blueraysl.com`. |

## License

© Blue-Ray (SL) Ltd. All content and photographs are property of the company.
