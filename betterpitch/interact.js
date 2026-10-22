// Pointer interactions for version 5 on GSAP (served by server.js from
// node_modules); styles in theme.css and hero.css:
//  - moving the mouse over the hero sends water rings out from the cursor,
//    and a click drops a bigger stone;
//  - buttons wobble like jelly when the mouse comes onto them;
//  - a pearl glides under whichever nav link is hovered.
// The only new nodes are a canvas inside the hero (which hero.js owns) and the
// pearl, appended to <body> outside React's tree.
(function () {
  if (!window.gsap) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(pointer: fine)').matches;
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  function heroWater() {
    const box = document.querySelector('#bp-hero .bph-box');
    if (!box) return;
    const cv = document.createElement('canvas');
    cv.className = 'bph-ripples';
    box.insertBefore(cv, box.firstChild);
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = box.clientWidth; h = box.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
    };
    size();
    new ResizeObserver(size).observe(box);
    const rings = [];
    let running = false;
    const draw = now => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let i = rings.length - 1; i >= 0; i--) {
        // a frame time can be a little older than the drop itself
        const r = rings[i], p = Math.max(0, (now - r.t) / r.dur);
        if (p >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - p, 3);
        // two rings per drop, flattened so the surface reads as seen at an angle
        for (const k of [1, .6]) {
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.max * e * k, r.max * e * k * .42, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200,250,240,${(1 - p) * r.a * k})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      if (rings.length) requestAnimationFrame(draw); else { running = false; ctx.clearRect(0, 0, w, h); }
    };
    const drop = (x, y, max, a, dur) => {
      if (rings.length > 30) return;
      rings.push({ x, y, max, a, dur, t: performance.now() });
      if (!running) { running = true; requestAnimationFrame(draw); }
    };
    let lx = -99, ly = -99, lt = 0;
    box.addEventListener('pointermove', e => {
      const b = box.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, now = performance.now();
      if (Math.hypot(x - lx, y - ly) < 36 || now - lt < 70) return;
      lx = x; ly = y; lt = now;
      drop(x, y, gsap.utils.random(70, 110), .55, 1400);
    });
    box.addEventListener('pointerdown', e => {
      const b = box.getBoundingClientRect();
      drop(e.clientX - b.left, e.clientY - b.top, 220, .9, 1900);
      setTimeout(() => drop(e.clientX - b.left, e.clientY - b.top, 150, .6, 1600), 180);
    });
  }

  function jelly() {
    for (const b of $$('a.bg-primary-800, button.bg-primary-800, #bp-hero .bph-btn')) {
      if (b._bpJ) continue;
      b._bpJ = true;
      b.addEventListener('pointerenter', () => {
        if (gsap.isTweening(b)) return;
        gsap.fromTo(b, { scaleX: 1.12, scaleY: .88 }, { scaleX: 1, scaleY: 1, duration: .9, ease: 'elastic.out(1.2, .3)', clearProps: 'transform' });
      });
    }
  }

  function navPearl() {
    // the header renders more than one <nav> (desktop and mobile), so use them all
    const navs = $$('nav');
    if (!navs.length || !fine) return;
    const pearl = document.createElement('i');
    pearl.className = 'bp-pearl';
    document.body.appendChild(pearl);
    let shown = false;
    for (const a of $$('nav a, nav button')) {
      a.addEventListener('pointerenter', () => {
        const r = a.getBoundingClientRect();
        if (!r.width || !a.textContent.trim()) return;
        const x = r.left + r.width / 2 - 5, y = r.bottom + 3;
        if (!shown) gsap.set(pearl, { x, y, scale: 0 });
        shown = true;
        gsap.to(pearl, { x, y, scale: 1, autoAlpha: 1, duration: .55, ease: 'elastic.out(1, .6)', overwrite: 'auto' });
      });
    }
    for (const nav of navs) nav.addEventListener('pointerleave', () => {
      shown = false;
      gsap.to(pearl, { scale: 0, autoAlpha: 0, duration: .3, ease: 'power2.in', overwrite: 'auto' });
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    heroWater();
    jelly();
    navPearl();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; jelly(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  // after theme.js (load + 600ms) and motion.js (load + 900ms)
  window.addEventListener('load', () => setTimeout(start, 1100));
  setTimeout(start, 5000);
})();
