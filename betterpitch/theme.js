// Site-wide motion for version 3 (styles in theme.css), injected into every
// HTML page by server.js:
//  - lifts the preloader curtain once the page is ready;
//  - parallax: images drift at their own speed while scrolling;
//  - sections open like curtains, headings track in and get a gold line;
//  - cards get a gold spotlight border that follows the mouse;
//  - numbers count up from 0 when they scroll into view;
//  - the nav turns to glass once the page scrolls.
// Like content.js it waits for React to hydrate, and it only sets data
// attributes, custom properties and (for counters, ending on the original
// text) text node values. Things already on screen are not hidden.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
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
  const reveal = (attr, done, margin) => new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      e.target.setAttribute(attr, 'in');
      if (done) done(e.target);
    }
  }, { threshold: 0, rootMargin: `0px 0px ${margin || '-12%'} 0px` });
  const below = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= innerHeight; };
  // Inside a closed curtain an element counts as hidden, so it is triggered by
  // its curtain section instead of by itself.
  const watchers = new Map();
  const watchIO = new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      for (const fn of watchers.get(e.target) || []) fn();
      watchers.delete(e.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  const whenVisible = (el, fn) => {
    const t = el.closest('[data-bp-curtain="wait"]') || el;
    if (!watchers.has(t)) { watchers.set(t, []); watchIO.observe(t); }
    watchers.get(t).push(t === el ? fn : () => setTimeout(fn, 350));
  };
  const noAfter = el => getComputedStyle(el, '::after').content === 'none';

  function parallax() {
    const items = [];
    for (const img of document.querySelectorAll('main section img')) {
      if (img.closest('#bp-hero, [class*="marquee"]')) continue;
      const r = img.getBoundingClientRect();
      if (r.width < 200) continue;
      const cs = getComputedStyle(img);
      // leave images that already move themselves alone
      if (cs.translate !== 'none' || cs.transform !== 'none' || cs.scale !== 'none') continue;
      const abs = cs.position === 'absolute';
      const clipped = getComputedStyle(img.parentElement).overflow !== 'visible';
      img.dataset.bpPx = !abs && clipped ? 'zoom' : '';
      items.push({ el: img, f: abs ? .12 : .05, max: abs ? 80 : r.height * .035, py: 0 });
    }
    if (!items.length) return;
    onScroll(() => {
      const vh = innerHeight;
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) continue;
        // the measured box already includes the current shift
        const off = r.top - it.py + r.height / 2 - vh / 2;
        it.py = Math.max(-it.max, Math.min(it.max, -off * it.f));
        it.el.style.setProperty('--bp-py', it.py.toFixed(1) + 'px');
      }
    });
  }

  function curtains() {
    const io = reveal('data-bp-curtain', el => setTimeout(() => el.removeAttribute('data-bp-curtain'), 1300), '-15%');
    for (const el of document.querySelectorAll('main section, main .bg-white.rounded-2xl.py-16')) {
      if (el.closest('#bp-hero') || el.parentElement.closest('section, [data-bp-curtain]') || !below(el)) continue;
      el.dataset.bpCurtain = 'wait';
      io.observe(el);
    }
  }

  function headings() {
    const show = h => {
      h.dataset.bpLine = 'in';
      if (h.dataset.bpTrack) {
        h.dataset.bpTrack = 'in';
        setTimeout(() => h.removeAttribute('data-bp-track'), 1200);
      }
    };
    for (const h of document.querySelectorAll('main h1, main h2')) {
      if (h.closest('#bp-hero') || h.dataset.bpLine) continue;
      const cs = getComputedStyle(h);
      if (cs.position !== 'static' && cs.position !== 'relative' || !noAfter(h)) continue;
      const a = cs.textAlign;
      h.dataset.bpAlign = a === 'center' ? 'center' : a === 'right' || a === 'end' ? 'right' : 'left';
      h.dataset.bpLine = 'wait';
      if (!reduced && below(h)) h.dataset.bpTrack = 'wait';
      whenVisible(h, () => show(h));
    }
  }

  function spotlights() {
    const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-2xl[class*="bg-gradient"]';
    for (const c of document.querySelectorAll(CARDS)) {
      if (c.dataset.bpSpot !== undefined || c.closest('#bp-hero') || c.parentElement.closest('[data-bp-spot]') || !noAfter(c)) continue;
      if (getComputedStyle(c).position === 'static') {
        // making it relative would re-anchor absolutely positioned children
        if ([...c.querySelectorAll('*')].some(n => getComputedStyle(n).position === 'absolute')) continue;
        c.dataset.bpSpot = 'rel';
      } else c.dataset.bpSpot = '';
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--bp-sx', (e.clientX - r.left).toFixed(0) + 'px');
        c.style.setProperty('--bp-sy', (e.clientY - r.top).toFixed(0) + 'px');
      });
    }
  }

  // "~2,500", "6,991", "38%" ... count from 0 and end on the exact original text.
  function counters() {
    const NUM = /^([~$+]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?([%+kKmMx]*)$/;
    function run(el) {
      const node = el._bpNode, orig = node.nodeValue;
      const [, pre, int, dec, suf] = el._bpParts;
      const lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
      const target = parseFloat(int.replace(/,/g, '') + (dec || ''));
      const places = dec ? dec.length - 1 : 0, commas = int.includes(',');
      const t0 = performance.now(), dur = 1400;
      el.dataset.bpCount = '';
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), v = target * (1 - Math.pow(1 - p, 3));
        if (p < 1) {
          let s = v.toFixed(places);
          if (commas) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
          node.nodeValue = lead + pre + s + suf + trail;
          requestAnimationFrame(step);
        } else {
          node.nodeValue = orig;
          el.removeAttribute('data-bp-count');
        }
      };
      requestAnimationFrame(step);
    }
    for (const el of document.querySelectorAll('main *')) {
      if (el.children.length || el.closest('#bp-hero, script, style')) continue;
      const node = el.firstChild;
      if (!node || node.nodeType !== 3 || el.childNodes.length !== 1) continue;
      const m = node.nodeValue.trim().match(NUM);
      if (!m || parseFloat(m[2].replace(/,/g, '')) < 10) continue;
      el._bpNode = node;
      el._bpParts = m;
      whenVisible(el, () => run(el));
    }
  }

  function glassNav() {
    const nav = document.querySelector('#page-scroller nav') || document.querySelector('nav');
    if (!nav) return;
    onScroll(sc => { if (sc.scrollTop > 24) nav.dataset.bpScrolled = ''; else nav.removeAttribute('data-bp-scrolled'); });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    root.dataset.bpReady = '';
    // curtains first, so headings and counters inside them hang off their curtain
    if (!reduced) curtains();
    headings();
    glassNav();
    spotlights();
    if (reduced) return;
    parallax();
    counters();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; spotlights(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  window.addEventListener('load', () => setTimeout(start, 600));
  setTimeout(start, 4500);
})();
