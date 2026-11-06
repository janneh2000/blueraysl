/* Blue-Ray site JavaScript — no dependencies, no third-party calls. */
(function () {
  'use strict';

  /* ---------- mobile nav ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- lightbox ---------- */
  var lb = null;
  var lastFocus = null;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Enlarged image');
    lb.innerHTML =
      '<button class="lightbox-close" aria-label="Close image">×</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLb();
    });
  }

  function openLb(src, caption, alt) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    var img = lb.querySelector('img');
    var cap = lb.querySelector('figcaption');
    img.src = src;
    img.alt = alt || caption || '';
    cap.textContent = caption || '';
    cap.hidden = !caption;
    lb.classList.add('open');
    document.body.classList.add('no-scroll');
    lb.querySelector('.lightbox-close').focus();
  }

  function closeLb() {
    if (!lb) return;
    lb.classList.remove('open');
    document.body.classList.remove('no-scroll');
    lb.querySelector('img').src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb && lb.classList.contains('open')) closeLb();
  });

  document.querySelectorAll('.tile[data-full]').forEach(function (tile) {
    var full = tile.getAttribute('data-full');
    if (!full) return;
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    var img = tile.querySelector('img');
    var cap = tile.querySelector('figcaption');
    var capText = cap ? cap.textContent.replace(/\s+/g, ' ').trim() : '';
    tile.setAttribute('aria-label', 'Enlarge: ' + (capText || (img && img.alt) || 'image'));
    function open() { openLb(full, capText, img && img.alt); }
    tile.addEventListener('click', open);
    tile.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  /* ---------- project filter ---------- */
  var chips = document.querySelectorAll('.chip');
  if (chips.length) {
    var empty = document.getElementById('filter-empty');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', String(on));
        });
        var shown = 0;
        document.querySelectorAll('.project-card').forEach(function (card) {
          var match = cat === 'all' || card.getAttribute('data-category') === cat;
          card.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }

  /* ---------- animated counters ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animate = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      if (reduce) { el.textContent = String(target); return; }
      var start = performance.now();
      var tick = function (now) {
        var t = Math.min((now - start) / 1400, 1);
        el.textContent = String(Math.floor(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = String(target);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animate(e.target); co.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (c) { co.observe(c); });
    } else {
      counters.forEach(animate);
    }
  }

  /* ---------- one video at a time ---------- */
  document.querySelectorAll('video').forEach(function (v) {
    v.addEventListener('play', function () {
      document.querySelectorAll('video').forEach(function (other) {
        if (other !== v && !other.paused) other.pause();
      });
    });
  });

  /* ---------- contact form ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = document.getElementById('form-status');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';

    var mailtoFallback = function (p) {
      var subject = encodeURIComponent('Website enquiry — ' + (p.service || 'General'));
      var body = encodeURIComponent(
        'Name: ' + p.name + '\nEmail: ' + p.email + '\nPhone: ' + (p.phone || '') +
        '\nAbout: ' + (p.service || '') + '\n\n' + p.message
      );
      window.location.href = 'mailto:info@blueraysl.com?subject=' + subject + '&body=' + body;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var fd = new FormData(form);
      var payload = {
        name: (fd.get('name') || '').trim(),
        email: (fd.get('email') || '').trim(),
        phone: (fd.get('phone') || '').trim(),
        service: (fd.get('service') || '').trim(),
        message: (fd.get('message') || '').trim(),
        company_website: (fd.get('company_website') || '').trim()
      };

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      if (status) { status.className = 'form-status'; status.textContent = ''; }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().then(function (body) { return { res: res, body: body }; });
      }).then(function (r) {
        if (r.res.ok && r.body.ok) {
          form.innerHTML =
            '<h2>Thank you — message received.</h2>' +
            '<p class="muted">We have your details and will reply within one business day. ' +
            'If it is urgent, call <a href="tel:+23278746182">+232-78-746182</a> ' +
            'or <a href="https://wa.me/23278746182" target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>.</p>';
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (r.res.status === 422 && r.body.errors) {
          var first = Object.keys(r.body.errors)[0];
          if (status) {
            status.className = 'form-status error';
            status.textContent = r.body.errors[first];
          }
          var field = form.querySelector('[name="' + first + '"]');
          if (field) field.focus();
          return;
        }
        // Anything else (not configured yet, provider down): never strand the person.
        mailtoFallback(payload);
        if (status) {
          status.className = 'form-status';
          status.textContent = 'Opening your email app so the message is not lost…';
        }
      }).catch(function () {
        mailtoFallback(payload);
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    });
  }

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
