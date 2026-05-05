// Blue-Ray site JavaScript
(function () {
  'use strict';

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navToggle.setAttribute(
        'aria-expanded',
        navLinks.classList.contains('open')
      );
    });
    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => navLinks.classList.remove('open'))
    );
  }

  // Reveal-on-scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // Lightbox
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbClose = lightbox.querySelector('.lightbox-close');
    document.querySelectorAll('[data-lightbox]').forEach((card) => {
      card.addEventListener('click', () => {
        const src = card.getAttribute('data-lightbox');
        lbImg.src = src;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });
    const closeLb = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    };
    lbClose && lbClose.addEventListener('click', closeLb);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLb();
    });
  }

  // Project filter chips
  const chips = document.querySelectorAll('.chip');
  if (chips.length) {
    chips.forEach((chip) =>
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-filter');
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        document.querySelectorAll('.project-card').forEach((card) => {
          const cardCat = card.getAttribute('data-category');
          card.style.display =
            cat === 'all' || cardCat === cat ? '' : 'none';
        });
      })
    );
  }

  // Animated counters
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const animateCount = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              animateCount(e.target);
              co.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((c) => co.observe(c));
    } else {
      counters.forEach(animateCount);
    }
  }

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
})();
