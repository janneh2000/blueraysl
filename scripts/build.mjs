#!/usr/bin/env node
/**
 * Blue-Ray static site build.
 *
 * Renders src/pages/*.html into dist/ using src/layouts/base.html, so the nav,
 * footer and <head> live in exactly one place. Zero dependencies on purpose:
 * Cloudflare Pages runs `node scripts/build.mjs` with no install step.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

const site = json("src/data/site.json");
const minerals = json("src/data/minerals.json");
const projects = json("src/data/projects.json");
const achievements = json("src/data/achievements.json");
const media = existsSync(join(ROOT, "src/data/media-index.json"))
  ? json("src/data/media-index.json")
  : { photos: {}, videos: {} };

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const warnings = [];

/* ---------- media helpers ---------- */

function picture(slug, { sizes = "100vw", lazy = true, className = "", alt = "", priority = false } = {}) {
  const m = media.photos[slug];
  if (!m) { warnings.push(`missing photo: ${slug}`); return `<!-- missing photo: ${slug} -->`; }
  const srcset = (ext) => m.sizes.map((w) => `/${m.path}-${w}.${ext} ${w}w`).join(", ");
  const fallbackW = m.sizes[m.sizes.length - 1];
  const loading = priority ? "eager" : (lazy ? "lazy" : "eager");
  const fetchpriority = priority ? ' fetchpriority="high"' : "";
  return `<picture${className ? ` class="${className}"` : ""}>
  <source type="image/avif" srcset="${srcset("avif")}" sizes="${sizes}">
  <source type="image/webp" srcset="${srcset("webp")}" sizes="${sizes}">
  <img src="/${m.path}-${fallbackW}.jpg" srcset="${srcset("jpg")}" sizes="${sizes}"
       width="${m.width}" height="${m.height}" alt="${esc(alt)}"
       loading="${loading}" decoding="async"${fetchpriority}>
</picture>`;
}

function videoBlock(slug, { caption = "", alt = "" } = {}) {
  const v = media.videos[slug];
  if (!v) { warnings.push(`missing video: ${slug}`); return `<!-- missing video: ${slug} -->`; }
  return `<figure class="vid vid-${v.orientation}">
  <video controls preload="none" playsinline
         poster="/${v.poster}" width="${v.width}" height="${v.height}"
         aria-label="${esc(alt || caption)}">
    <source src="/${v.mp4}" type="video/mp4">
    <a href="/${v.mp4}">Download this video</a>
  </video>
  ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}
</figure>`;
}

/* ---------- block generators ---------- */

function mineralNavChips() {
  return `<div class="mineral-chips">` + minerals.map((m) =>
    `<a class="chip-link" href="#${m.key}">${esc(m.short)}</a>`).join("") + `</div>`;
}

function mineralSections() {
  return minerals.map((m) => {
    const tiles = m.photos.map((p) => {
      const meta = media.photos[p.slug];
      const orient = meta ? meta.orientation : "landscape";
      return `<figure class="tile tile-${orient}" data-full="/${meta ? meta.path : ""}-${meta ? meta.sizes[meta.sizes.length - 1] : 800}.jpg">
  ${picture(p.slug, { sizes: "(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 30vw", alt: p.alt })}
  <figcaption>${esc(p.caption)}</figcaption>
</figure>`;
    }).join("\n");

    const vids = m.videos.map((v) => videoBlock(v.slug, { caption: v.caption, alt: v.alt })).join("\n");

    return `<section class="section mineral" id="${m.key}">
  <div class="container">
    <div class="mineral-head reveal">
      <span class="section-eyebrow">Mineral Stream</span>
      <h2 class="section-title">${esc(m.name)}</h2>
      <p class="section-lead">${esc(m.lead)}</p>
      <p class="muted mineral-body">${esc(m.body)}</p>
    </div>
    ${tiles ? `<div class="gallery reveal">\n${tiles}\n</div>` : ""}
    ${vids ? `<div class="vid-row reveal">\n${vids}\n</div>` : ""}
  </div>
</section>`;
  }).join("\n");
}

function projectGrid() {
  return projects.map((p) => {
    const meta = media.photos[p.slug];
    const orient = meta ? meta.orientation : "landscape";
    const full = meta ? `/${meta.path}-${meta.sizes[meta.sizes.length - 1]}.jpg` : "";
    return `<figure class="tile tile-${orient} project-card" data-category="${esc(p.category)}" data-full="${full}">
  ${picture(p.slug, { sizes: "(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 30vw", alt: p.alt })}
  <figcaption>
    <span class="project-tag">${esc(p.tag)}</span>
    <strong>${esc(p.title)}</strong>
    <span>${esc(p.caption)}</span>
  </figcaption>
</figure>`;
  }).join("\n");
}

function achievementList() {
  return achievements.map((a, i) => `<article class="achievement reveal${a.featured ? " featured" : ""}">
  <div class="achievement-media">
    ${picture(a.image, { sizes: "(max-width: 900px) 92vw, 45vw", alt: a.alt })}
  </div>
  <div class="achievement-body">
    <span class="achievement-year">${esc(a.year)}</span>
    <h3>${esc(a.title)}</h3>
    <p>${esc(a.narrative)}</p>
    <dl class="achievement-meta">
      ${a.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("\n      ")}
    </dl>
  </div>
</article>`).join("\n");
}

function statsBand() {
  return `<div class="stats-grid">` + site.stats.map((s) =>
    `<div class="stat">
      <div class="stat-num"><span data-count="${s.value}">0</span>${esc(s.suffix)}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join("") + `</div>`;
}

function partnerGrid() {
  return site.partners.map((p) =>
    `<div class="partner reveal">
      <div class="partner-name">${esc(p.name)}</div>
      <div class="partner-loc">${esc(p.loc)}</div>
    </div>`).join("\n");
}

function clientList() {
  return site.clients.map((c) =>
    `<div class="client reveal">${esc(c)}</div>`).join("\n");
}

function leadershipGrid() {
  return site.leadership.map((l) =>
    `<div class="leader reveal">
      <div class="leader-avatar" aria-hidden="true">${esc(l.initials)}</div>
      <div class="leader-name">${esc(l.name)}</div>
      <div class="leader-role">${esc(l.role)}</div>
      <div class="leader-contact">
        ${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a><br>` : ""}
        ${l.phone ? `<a href="tel:${esc(l.phone.replace(/[^+\d]/g, ""))}">${esc(l.phone)}</a><br>` : ""}
        ${esc(l.note)}
      </div>
    </div>`).join("\n");
}

const BLOCKS = {
  mineralSections, mineralNavChips, projectGrid, achievementList,
  statsBand, partnerGrid, clientList, leadershipGrid,
};

/* ---------- structured data ---------- */

function jsonLd(meta) {
  const c = site.contact;
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.origin}/#organization`,
    name: site.name,
    alternateName: site.shortName,
    url: `${site.origin}/`,
    logo: `${site.origin}/assets/img/site/logo-small-300.jpg`,
    description: site.description,
    foundingDate: site.founded,
    address: {
      "@type": "PostalAddress",
      streetAddress: c.addressLine1,
      addressLocality: c.city,
      addressCountry: c.country,
    },
    telephone: [c.phonePrimary, c.phoneSecondary],
    email: c.emailPrimary,
    areaServed: ["Sierra Leone", "West Africa"],
    knowsAbout: ["Road construction", "Bridge construction", "Bauxite mining",
      "Gold mining", "Diamond mining", "Heavy mineral sands", "Coltan", "Sand mining"],
  };
  const graph = [org];

  if (meta.nav === "home") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: `${site.origin}/`,
      name: site.name,
      publisher: { "@id": `${site.origin}/#organization` },
    });
  }
  if (meta.breadcrumb) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site.origin}/` },
        { "@type": "ListItem", position: 2, name: meta.breadcrumb, item: meta.canonicalUrl },
      ],
    });
  }
  return `<script type="application/ld+json">${JSON.stringify(graph.length === 1 ? graph[0] : graph)}</script>`;
}

/* ---------- page rendering ---------- */

function navLinks(active) {
  return site.nav.map((n) =>
    `<li><a href="/${n.href}"${n.key === active ? ' class="active" aria-current="page"' : ""}>${esc(n.label)}</a></li>`
  ).join("\n        ");
}

function render(file) {
  const raw = read(join("src/pages", file));
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing <!--meta ... --> block`);
  const meta = JSON.parse(m[1]);
  let content = raw.slice(m[0].length);

  // Expand {{blockName}} tokens inside page content.
  content = content.replace(/\{\{(\w+)\}\}/g, (full, name) => {
    if (BLOCKS[name]) return BLOCKS[name]();
    warnings.push(`${file}: unknown block {{${name}}}`);
    return full;
  });

  const out = file === "index.html" ? "index.html" : file;
  const canonicalUrl = `${site.origin}/${out === "index.html" ? "" : out}`;
  meta.canonicalUrl = canonicalUrl;

  const ogImageSlug = meta.ogImage || "bridge-construction";
  const ogMeta = media.photos[ogImageSlug];
  const ogImage = ogMeta
    ? `${site.origin}/${ogMeta.path}-${ogMeta.sizes[ogMeta.sizes.length - 1]}.jpg`
    : `${site.origin}/assets/img/hero/bridge-construction-1200.jpg`;

  let html = read("src/layouts/base.html")
    .replace("{{content}}", content)
    .replace(/\{\{title\}\}/g, esc(meta.title))
    .replace(/\{\{ogTitle\}\}/g, esc(meta.ogTitle || meta.title))
    .replace(/\{\{description\}\}/g, esc(meta.description))
    .replace(/\{\{canonical\}\}/g, canonicalUrl)
    .replace(/\{\{ogType\}\}/g, meta.nav === "home" ? "website" : "article")
    .replace(/\{\{ogImage\}\}/g, ogImage)
    .replace("{{navLinks}}", navLinks(meta.nav))
    .replace("{{contactActive}}", meta.nav === "contact" ? " active" : "")
    .replace("{{jsonld}}", jsonLd(meta));

  mkdirSync(DIST, { recursive: true });
  writeFileSync(join(DIST, out), html);
  return { out, bytes: Buffer.byteLength(html) };
}

/* ---------- sitemap ---------- */

function sitemap(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const priority = { "index.html": "1.0", "mining.html": "0.9", "achievements.html": "0.9" };
  const urls = pages.map((p) => {
    const loc = `${site.origin}/${p === "index.html" ? "" : p}`;
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><priority>${priority[p] || "0.8"}</priority></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/* ---------- run ---------- */

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const pages = readdirSync(join(ROOT, "src/pages")).filter((f) => f.endsWith(".html")).sort();
const built = pages.map(render);

for (const dir of ["assets", "css", "js"]) {
  if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
}
for (const f of ["robots.txt", "_headers", "_redirects", "site.webmanifest"]) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(DIST, f));
}
writeFileSync(join(DIST, "sitemap.xml"), sitemap(pages.filter((p) => p !== "404.html")));

console.log("built:");
for (const b of built) console.log(`   ${b.out.padEnd(22)} ${(b.bytes / 1024).toFixed(1)} KB`);
console.log(`   sitemap.xml`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of [...new Set(warnings)]) console.log(`   ! ${w}`);
  process.exitCode = 1;
}
