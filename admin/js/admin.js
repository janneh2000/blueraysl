// ========================================================
//   BLUE-RAY ADMIN — shared helpers
//   Loaded on every admin page after the Supabase JS lib.
// ========================================================

(function () {
  'use strict';

  // --- Initialise Supabase client ---
  if (!window.supabase || !window.BLUERAY_CONFIG) {
    console.error('Supabase or BLUERAY_CONFIG missing on admin page.');
    return;
  }
  const sb = window.supabase.createClient(
    window.BLUERAY_CONFIG.SUPABASE_URL,
    window.BLUERAY_CONFIG.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
  window.adminSb = sb;

  // --- Auth gate: redirect to login if no session, except on the login page itself ---
  const isLoginPage = document.body.dataset.page === 'login';

  async function gate() {
    const { data: { session } } = await sb.auth.getSession();

    if (!session && !isLoginPage) {
      // Save attempted path so we can return after login
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
      location.replace('login.html');
      return;
    }
    if (session && isLoginPage) {
      const redirectTo = sessionStorage.getItem('postLoginRedirect') || 'index.html';
      sessionStorage.removeItem('postLoginRedirect');
      location.replace(redirectTo);
      return;
    }
    if (session) {
      // Render the user's email in the sidebar if the slot exists
      const emailEl = document.querySelector('[data-user-email]');
      if (emailEl) emailEl.textContent = session.user.email;
    }
  }
  gate();

  // --- Logout button ---
  document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-action="logout"]')) {
      await sb.auth.signOut();
      location.replace('login.html');
    }
    if (e.target.matches('[data-action="burger"]')) {
      document.querySelector('.admin-sidebar')?.classList.toggle('open');
    }
  });

  // --- Toast notifications ---
  window.toast = function (msg, type = 'success') {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast ' + (type === 'error' ? 'error' : '');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 3000);
  };

  // --- Helper: render the sidebar nav (so it's identical on every page) ---
  window.renderSidebar = function (current) {
    const nav = [
      { href: 'index.html',       icon: '📊', label: 'Dashboard',   key: 'dashboard' },
      { href: 'submissions.html', icon: '📨', label: 'Submissions', key: 'submissions' },
      { href: 'settings.html',    icon: '⚙️', label: 'Settings',    key: 'settings' },
      { href: 'projects.html',    icon: '🏗',  label: 'Projects',    key: 'projects' },
      { href: 'news.html',        icon: '📰', label: 'News',        key: 'news' },
    ];
    const html = `
      <aside class="admin-sidebar">
        <a href="index.html" class="admin-sidebar-brand">
          <img src="../images/logo-small.png" alt="Blue-Ray">
          <div class="admin-sidebar-brand-text">Blue-Ray<span>Admin</span></div>
        </a>
        <ul class="admin-nav">
          ${nav.map(n => `
            <li><a href="${n.href}" class="${current === n.key ? 'active' : ''}">
              <span class="icon">${n.icon}</span>
              <span>${n.label}</span>
            </a></li>
          `).join('')}
        </ul>
        <div class="admin-user">
          <div class="admin-user-email" data-user-email>—</div>
          <a href="../index.html" class="btn-logout" target="_blank" style="margin-right:6px;">View site</a>
          <button class="btn-logout" data-action="logout">Sign out</button>
        </div>
      </aside>
    `;
    const slot = document.querySelector('[data-sidebar]');
    if (slot) slot.outerHTML = html;
  };

  // --- Helper: HTML escape ---
  window.escHtml = function (s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // --- Helper: format date ---
  window.fmtDate = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Helper: slugify ---
  window.slugify = function (s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  };
})();
