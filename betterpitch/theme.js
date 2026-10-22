// Site-wide state for version 5 (styles in theme.css), injected into every
// HTML page by server.js:
//  - caustic light ripples over dark sections;
//  - sections rise into view behind a wave, like the tide coming in;
//  - images open out of a pearl.
// GSAP motion lives in motion.js and pointer interactions in interact.js.
// Like content.js it waits for React to hydrate, and it only sets data
// attributes and custom properties, removing the entrance ones once they have
// played. Things already on screen are not hidden.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const below = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= innerHeight; };
  // sliders and marquees move sideways, so their items may never scroll into view
  const skip = el => el.closest('#bp-hero, [class*="marquee"], [class*="embla"]');
  // Entrance helper: el gets attr="wait" now, "in" when it scrolls into view,
  // and the attribute is dropped once the transition has finished.
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      const { attr, ms } = e.target._bpIn;
      e.target.setAttribute(attr, 'in');
      setTimeout(() => e.target.removeAttribute(attr), ms);
    }
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  const enter = (el, attr, ms) => {
    el.setAttribute(attr, 'wait');
    el._bpIn = { attr, ms };
    io.observe(el);
  };

  function caustics() {
    for (const el of document.querySelectorAll('main section, main section > div, footer')) {
      if (el.dataset.bpCaustic !== undefined || el.closest('#bp-hero, [data-bp-caustic]')) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width < 400 || r.height < 200 || cs.backgroundImage !== 'none') continue;
      const m = cs.backgroundColor.match(/[\d.]+/g);
      if (!m || (m[3] !== undefined && +m[3] < .9)) continue;
      if ((.2126 * m[0] + .7152 * m[1] + .0722 * m[2]) / 255 < .4) el.dataset.bpCaustic = '';
    }
  }

  function tides() {
    for (const el of document.querySelectorAll('main section, main .bg-white.rounded-2xl.py-16')) {
      if (el.closest('#bp-hero') || el.parentElement.closest('section, [data-bp-tide]') || !below(el)) continue;
      if (getComputedStyle(el).maskImage !== 'none') continue;
      enter(el, 'data-bp-tide', 1400);
    }
  }

  function irises() {
    for (const img of document.querySelectorAll('main img')) {
      if (skip(img) || !below(img) || img.getBoundingClientRect().width < 160) continue;
      const cs = getComputedStyle(img);
      if (cs.clipPath !== 'none') continue;
      img.style.setProperty('--bp-r', cs.borderRadius.split(' ')[0] || '0px');
      enter(img, 'data-bp-iris', 1400);
    }
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    caustics();
    if (!reduced) {
      tides();
      irises();
    }
  }
  window.addEventListener('load', () => setTimeout(start, 600));
  setTimeout(start, 4500);
})();
