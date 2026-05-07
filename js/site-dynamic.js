// ========================================================
//   BLUE-RAY — public-site dynamic content
//   Fetches editable settings from Supabase and substitutes
//   them into elements marked with data-setting / data-setting-href.
//   Falls back gracefully if Supabase is unreachable (the
//   hardcoded HTML stays as-is).
// ========================================================
(function () {
  'use strict';
  if (!window.supabase || !window.BLUERAY_CONFIG) return;
  const sb = window.supabase.createClient(
    window.BLUERAY_CONFIG.SUPABASE_URL,
    window.BLUERAY_CONFIG.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  function applySettings(map) {
    // 1. Replace text content for elements with data-setting="key"
    document.querySelectorAll('[data-setting]').forEach(el => {
      const key = el.getAttribute('data-setting');
      if (key in map && map[key] != null) {
        el.textContent = map[key];
      }
    });
    // 2. Update href values e.g. tel: links
    document.querySelectorAll('[data-setting-href]').forEach(el => {
      const spec = el.getAttribute('data-setting-href');
      // e.g. data-setting-href="tel:phone_primary"
      const [prefix, key] = spec.split(':');
      if (key in map && map[key] != null) {
        el.setAttribute('href', `${prefix}:${map[key].replace(/[^+\d]/g, '')}`);
      }
    });
    // 3. Update data-count for animated counters (home page stats)
    document.querySelectorAll('[data-setting-count]').forEach(el => {
      const key = el.getAttribute('data-setting-count');
      if (key in map && map[key] != null) {
        el.setAttribute('data-count', map[key]);
        // If counters have already animated to old number, set final value
        const span = el.querySelector('span[data-count]');
        if (span) span.setAttribute('data-count', map[key]);
      }
    });
  }

  async function loadProjects() {
    const grid = document.querySelector('[data-projects-grid]');
    if (!grid) return;
    const { data, error } = await sb.from('projects')
      .select('title,caption,category,image_url,featured,sort_order')
      .eq('status', 'published')
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return; // Keep hardcoded fallback
    grid.innerHTML = data.map(p => `
      <div class="project-card${p.featured ? ' featured' : ''}" data-category="${esc(p.category)}" data-lightbox="${esc(p.image_url)}">
        <img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy">
        <div class="project-card-meta">
          <span class="project-tag">${esc(cap(p.category))}</span>
          <h3>${esc(p.title)}</h3>
          ${p.caption ? `<p>${esc(p.caption)}</p>` : ''}
        </div>
      </div>
    `).join('');
    // Re-bind lightbox + filter handlers since we replaced the DOM
    rebindGalleryHandlers();
  }

  async function loadNewsList() {
    const list = document.querySelector('[data-news-list]');
    if (!list) return;
    const { data, error } = await sb.from('news_posts')
      .select('slug,title,excerpt,image_url,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) {
      list.innerHTML = `<p class="muted">Couldn't load news right now.</p>`;
      return;
    }
    if (!data || data.length === 0) {
      list.innerHTML = '<p class="muted center" style="padding: 60px 0;">No news posts yet — check back soon.</p>';
      return;
    }
    list.innerHTML = data.map(p => `
      <a class="news-card" href="news-post.html?slug=${encodeURIComponent(p.slug)}">
        ${p.image_url ? `<div class="news-card-image"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></div>` : ''}
        <div class="news-card-body">
          <span class="news-card-date">${fmt(p.published_at)}</span>
          <h3>${esc(p.title)}</h3>
          ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
          <span class="news-card-link">Read more →</span>
        </div>
      </a>
    `).join('');
  }

  async function loadNewsPost() {
    const slot = document.querySelector('[data-news-post]');
    if (!slot) return;
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { slot.innerHTML = '<p class="muted">No post specified.</p>'; return; }
    const { data, error } = await sb.from('news_posts')
      .select('title,excerpt,body,image_url,published_at,status')
      .eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error || !data) { slot.innerHTML = '<p class="muted">Post not found.</p>'; return; }
    slot.innerHTML = `
      <article class="news-post">
        <p class="muted" style="margin-bottom: 8px;">${fmt(data.published_at)}</p>
        <h1 style="margin-bottom: 18px;">${esc(data.title)}</h1>
        ${data.excerpt ? `<p class="news-excerpt">${esc(data.excerpt)}</p>` : ''}
        ${data.image_url ? `<img src="${esc(data.image_url)}" alt="${esc(data.title)}" class="news-post-image">` : ''}
        <div class="news-post-body">${esc(data.body || '').replace(/\n/g, '<br>')}</div>
      </article>
    `;
    document.title = `${data.title} — Blue-Ray`;
  }

  function rebindGalleryHandlers() {
    const lb = document.querySelector('.lightbox');
    if (lb) {
      const lbImg = lb.querySelector('img');
      document.querySelectorAll('[data-lightbox]').forEach(card => {
        card.addEventListener('click', () => {
          lbImg.src = card.getAttribute('data-lightbox');
          lb.classList.add('open');
          document.body.style.overflow = 'hidden';
        });
      });
    }
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-filter');
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        document.querySelectorAll('.project-card').forEach(card => {
          const cardCat = card.getAttribute('data-category');
          card.style.display = cat === 'all' || cardCat === cat ? '' : 'none';
        });
      });
    });
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function cap(s) { return String(s||'').replace(/^./, c => c.toUpperCase()); }
  function fmt(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  }

  async function init() {
    try {
      const { data, error } = await sb.from('site_settings').select('key,value');
      if (!error && data) {
        const map = {};
        data.forEach(s => map[s.key] = s.value);
        applySettings(map);
      }
    } catch (e) { /* fail silently — fallback HTML stays */ }
    loadProjects();
    loadNewsList();
    loadNewsPost();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
