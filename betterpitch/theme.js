// Site-wide motion for version 4 (styles in theme.css), injected into every
// HTML page by server.js:
//  - star dust drifts over dark sections;
//  - headings rise in and a silver shine sweeps across them (again on hover);
//  - images develop out of moonlight, cards flip up in 3D, paragraphs ink in;
//  - cards get a metallic glare on hover, navy buttons fill with silver from
//    the cursor;
//  - the nav slips away while scrolling down and returns on the way up.
// Like content.js it waits for React to hydrate, and it only sets data
// attributes and custom properties, removing the entrance ones once they have
// played. Things already on screen are not hidden.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The page scrolls inside #page-scroller, not the window.
  const scroller = () => document.getElementById('page-scroller') || document.scrollingElement;
  const onScroll = fn => {
    const sc = scroller();
    let ticking = false;
    (sc === document.scrollingElement ? window : sc).addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; fn(sc); }); }
    }, { passive: true });
    fn(sc);
  };
  const below = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= innerHeight; };
  // sliders and marquees move sideways, so their items may never scroll into view
  const skip = el => el.closest('#bp-hero, [class*="marquee"], [class*="embla"]');
  const moving = cs => cs.translate !== 'none' || cs.transform !== 'none' || cs.scale !== 'none' || cs.rotate !== 'none';
  // Entrance helper: el gets attr="wait" now, "in" when it scrolls into view,
  // and the attribute is dropped once the transition has finished.
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      const { attr, ms, done } = e.target._bpIn;
      e.target.setAttribute(attr, 'in');
      setTimeout(() => { e.target.removeAttribute(attr); if (done) done(e.target); }, ms);
    }
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  const enter = (el, attr, ms, done) => {
    el.setAttribute(attr, 'wait');
    el._bpIn = { attr, ms, done };
    io.observe(el);
  };

  function stars() {
    for (const el of document.querySelectorAll('main section, main section > div, footer')) {
      if (el.dataset.bpStars !== undefined || el.closest('#bp-hero, [data-bp-stars]')) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width < 400 || r.height < 200 || cs.backgroundImage !== 'none') continue;
      const m = cs.backgroundColor.match(/[\d.]+/g);
      if (!m || (m[3] !== undefined && +m[3] < .9)) continue;
      const lum = (.2126 * m[0] + .7152 * m[1] + .0722 * m[2]) / 255;
      if (lum < .3) el.dataset.bpStars = '';
    }
  }

  function headings() {
    const shine = h => {
      if (h.dataset.bpShine === 'in') return;
      h.dataset.bpShine = 'in';
      h.addEventListener('animationend', () => h.removeAttribute('data-bp-shine'), { once: true });
    };
    for (const h of document.querySelectorAll('main h1, main h2, main h3')) {
      if (skip(h) || h._bpH) continue;
      h._bpH = true;
      const cs = getComputedStyle(h);
      // the shine paints the text itself, so only plain one-colour headings get it
      const plain = cs.backgroundImage === 'none' && [...h.querySelectorAll('*')]
        .every(n => { const c = getComputedStyle(n); return c.color === cs.color && c.backgroundImage === 'none'; });
      if (plain) {
        h.style.setProperty('--bp-ink', cs.color);
        h.addEventListener('mouseenter', () => shine(h));
      }
      if (reduced || !below(h) || h.closest('[data-bp-flip]')) continue;
      enter(h, 'data-bp-rise', 1000, plain ? shine : null);
    }
  }

  function images() {
    for (const img of document.querySelectorAll('main img')) {
      if (skip(img) || !below(img) || img.getBoundingClientRect().width < 160) continue;
      const cs = getComputedStyle(img);
      if (moving(cs) || cs.filter !== 'none') continue;
      if (getComputedStyle(img.parentElement).overflow !== 'visible') img.dataset.bpClip = '';
      enter(img, 'data-bp-dev', 1800, el => el.removeAttribute('data-bp-clip'));
    }
  }

  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-2xl[class*="bg-gradient"], main .rounded-xl.bg-white';
  function cards() {
    for (const c of document.querySelectorAll(CARDS)) {
      if (c._bpC || skip(c) || c.parentElement.closest('[data-bp-glare], [data-bp-flip]')) continue;
      c._bpC = true;
      const cs = getComputedStyle(c);
      if (cs.backgroundImage === 'none') c.dataset.bpGlare = '';
      if (reduced || !below(c) || moving(cs)) continue;
      // stagger along the row: cards sharing a top edge come in one after another
      const top = Math.round(c.getBoundingClientRect().top);
      const row = [...c.parentElement.children].filter(n => Math.round(n.getBoundingClientRect().top) === top);
      c.style.setProperty('--bp-d', Math.max(0, row.indexOf(c)) * .12 + 's');
      enter(c, 'data-bp-flip', 1400, el => el.style.removeProperty('--bp-d'));
    }
  }

  function paragraphs() {
    for (const p of document.querySelectorAll('main p')) {
      if (skip(p) || !below(p) || p.closest('[data-bp-flip]') || p.textContent.trim().length < 40) continue;
      enter(p, 'data-bp-ink', 1400);
    }
  }

  function buttons() {
    for (const b of document.querySelectorAll('a.bg-primary-800, button.bg-primary-800')) {
      if (b._bpB) continue;
      b._bpB = true;
      b.addEventListener('pointerenter', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bp-bx', (e.clientX - r.left).toFixed(0) + 'px');
        b.style.setProperty('--bp-by', (e.clientY - r.top).toFixed(0) + 'px');
      });
    }
  }

  function smartNav() {
    const nav = document.querySelector('#page-scroller nav') || document.querySelector('nav');
    if (!nav) return;
    let last = 0;
    onScroll(sc => {
      const y = sc.scrollTop;
      if (y > 24) nav.dataset.bpScrolled = ''; else nav.removeAttribute('data-bp-scrolled');
      // hide only after the first screen, and never while something inside it has focus
      if (y > innerHeight * .6 && y > last + 4 && !nav.contains(document.activeElement)) nav.dataset.bpAway = '';
      else if (y < last - 4 || y <= innerHeight * .6) nav.removeAttribute('data-bp-away');
      last = y;
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    stars();
    // cards first, so headings inside a flipping card ride along with it
    cards();
    headings();
    images();
    buttons();
    smartNav();
    if (!reduced) paragraphs();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; cards(); buttons(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  window.addEventListener('load', () => setTimeout(start, 600));
  setTimeout(start, 4500);
})();
