// Pointer interactions for version 5 on GSAP (served by server.js from
// node_modules); styles in theme.css:
//  - nav links and buttons decode their label when hovered (letters scramble
//    and lock into place left to right, ending on the original text);
//  - arrow icons in links and buttons turn to point at the cursor;
//  - thin elastic strings run along the section edges: the cursor can pull
//    one and let it go, and it vibrates like a plucked string;
//  - the bottom-right corner of a card peels up as the cursor nears it;
//  - images go liquid under a fast-moving cursor and settle when it stops;
//  - outline buttons fill from the side the cursor came in and empty towards
//    the side it left.
// The only new nodes are a click-through canvas for the strings and an empty
// SVG holding the liquid filter, both appended to <body> outside React's tree.
(function () {
  if (!window.gsap) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(pointer: fine)').matches) return;
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const skip = el => el.closest('[class*="marquee"], [class*="embla"]');
  const visible = r => r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  const mouse = { x: -9999, y: -9999, t: 0, v: 0 };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now(), dt = Math.max(1, now - mouse.t);
    mouse.v = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y) / dt;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now;
  }, { passive: true });

  // label text nodes of an element (short ones only)
  const labels = el => {
    const out = [], walk = n => { for (const c of n.childNodes) c.nodeType === 3 ? out.push(c) : walk(c); };
    walk(el);
    return out.filter(t => { const s = t.nodeValue.trim(); return s.length >= 2 && s.length <= 30; });
  };

  function decode() {
    const LOWER = 'abcdefghijklmnopqrstuvwxyz', UPPER = LOWER.toUpperCase(), DIGIT = '0123456789';
    const pick = c => {
      const set = /[a-z]/.test(c) ? LOWER : /[A-Z]/.test(c) ? UPPER : /\d/.test(c) ? DIGIT : null;
      return set ? set[Math.floor(Math.random() * set.length)] : c;
    };
    for (const el of $$('nav a, nav button, a.bg-primary-800, button.bg-primary-800, #bp-hero .bph-btn, [data-bp-dir]')) {
      if (el._bpDec) continue;
      const texts = labels(el);
      if (!texts.length) continue;
      el._bpDec = true;
      el.addEventListener('pointerenter', () => {
        if (el._bpRun) return;
        el._bpRun = true;
        const orig = texts.map(t => t.nodeValue), t0 = performance.now(), dur = 520;
        const step = now => {
          const p = Math.min(1, (now - t0) / dur);
          texts.forEach((t, k) => {
            const s = orig[k], lock = Math.floor(p * s.length);
            let out = '';
            for (let i = 0; i < s.length; i++) out += i < lock ? s[i] : pick(s[i]);
            t.nodeValue = out;
          });
          if (p < 1) requestAnimationFrame(step);
          else { texts.forEach((t, k) => { t.nodeValue = orig[k]; }); el._bpRun = false; }
        };
        requestAnimationFrame(step);
      });
    }
  }

  function compass() {
    const arrows = [];
    for (const svg of $$('a svg, button svg')) {
      const host = svg.closest('a, button'), r = svg.getBoundingClientRect();
      if (svg._bpC || !host.textContent.trim() || r.width < 8 || r.width > 26 || host.closest('nav')) continue;
      svg._bpC = true;
      // the hero buttons use a north-east arrow, everything else points east
      const base = host.closest('#bp-hero') ? -45 : 0;
      gsap.set(svg, { transformOrigin: '50% 50%' });
      arrows.push({ svg, base, rot: gsap.quickTo(svg, 'rotation', { duration: .6, ease: 'power3' }), on: false });
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      for (const a of arrows) {
        const r = a.svg.getBoundingClientRect();
        if (!visible(r)) continue;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(mouse.x - cx, mouse.y - cy);
        if (d < 260) {
          let ang = Math.atan2(mouse.y - cy, mouse.x - cx) * 180 / Math.PI - a.base;
          ang = ((ang + 540) % 360) - 180;
          a.rot(ang * Math.min(1, (260 - d) / 120));
          a.on = true;
        } else if (a.on) { a.rot(0); a.on = false; }
      }
    };
    addEventListener('pointermove', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  }

  function strings() {
    const cv = document.createElement('canvas');
    cv.className = 'bp-strings';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let dpr = 1;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    size();
    addEventListener('resize', size);
    // a string along the top edge of each section after the first, the footer,
    // and the bottom edge of the hero box
    const edges = $$('main section').filter((s, i) => i > 0 && !s.parentElement.closest('section') && s.getBoundingClientRect().height > 200)
      .map(el => ({ el, side: 'top' }));
    const foot = document.querySelector('footer');
    if (foot) edges.push({ el: foot, side: 'top' });
    const box = document.querySelector('#bp-hero .bph-box');
    if (box) edges.push({ el: box, side: 'bottom' });
    const S = edges.map(e => ({ ...e, disp: 0, vel: 0, at: .5, grab: false }));
    let lastY = mouse.y;
    const frame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of S) {
        const r = s.el.getBoundingClientRect(), y = s.side === 'top' ? r.top : r.bottom - 1;
        const x1 = r.left + 32, x2 = r.right - 32;
        if (y < -80 || y > innerHeight + 80 || x2 <= x1) { s.disp = s.vel = 0; s.grab = false; continue; }
        const inX = mouse.x > x1 && mouse.x < x2, d = mouse.y - y, was = lastY - y;
        // the cursor catches the string when it crosses it, and drags it until it slips off
        if (!s.grab && inX && Math.sign(d) !== Math.sign(was) && Math.abs(was) < 120) { s.grab = true; s.at = (mouse.x - x1) / (x2 - x1); }
        if (s.grab) {
          if (!inX || Math.abs(d) > 70) s.grab = false;
          else { s.vel = d - s.disp; s.disp = d; s.at += ((mouse.x - x1) / (x2 - x1) - s.at) * .3; }
        }
        if (!s.grab) {
          s.vel += -.09 * s.disp; s.vel *= .9; s.disp += s.vel;
          if (Math.abs(s.disp) < .05 && Math.abs(s.vel) < .05) s.disp = s.vel = 0;
        }
        const px = x1 + (x2 - x1) * s.at, k = Math.min(1, Math.abs(s.disp) / 50);
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.quadraticCurveTo(px, y + s.disp * 2, x2, y);
        ctx.strokeStyle = `rgba(101,140,20,${.3 + k * .5})`;
        ctx.lineWidth = 1.2 + k;
        ctx.stroke();
      }
      lastY = mouse.y;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-xl.bg-white';
  function peel() {
    for (const c of $$(CARDS)) {
      if (c._bpPeel || skip(c) || c.parentElement.closest(CARDS) || getComputedStyle(c).backgroundImage !== 'none') continue;
      c._bpPeel = true;
      c.dataset.bpPeel = '';
      const st = { s: 0 };
      const to = s => gsap.to(st, { s, duration: .35, ease: 'power3', overwrite: true, onUpdate: () => c.style.setProperty('--bp-peel', st.s.toFixed(1) + 'px') });
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        to(Math.max(0, 1 - Math.hypot(r.right - e.clientX, r.bottom - e.clientY) / 240) * 70);
      });
      c.addEventListener('pointerleave', () => to(0));
    }
  }

  function liquidImages() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML = '<filter id="bp-liquid" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="7" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(svg);
    const turb = svg.querySelector('feTurbulence'), disp = svg.querySelector('feDisplacementMap');
    let cur = null, amt = 0, running = false;
    const t0 = performance.now();
    const loop = now => {
      const target = cur ? Math.min(22, mouse.v * 10) : 0;
      // rises quickly with speed, settles slowly once the cursor stops
      amt += (target - amt) * (target > amt ? .25 : .06);
      mouse.v *= .9;
      const f = (now - t0) / 1000;
      disp.setAttribute('scale', amt.toFixed(2));
      turb.setAttribute('baseFrequency', `${(.012 + Math.sin(f) * .002).toFixed(4)} ${(.03 + Math.cos(f * .8) * .004).toFixed(4)}`);
      // the cursor may have left for the chat iframe or the desktop without a pointermove here
      if (cur && amt < .2 && now - mouse.t > 1200) { cur.removeAttribute('data-bp-liquid'); cur = null; }
      if (amt < .2 && !cur) { running = false; return; }
      requestAnimationFrame(loop);
    };
    // overlays often sit on top of the images and take the pointer events, so
    // the image under the cursor is found from its box instead
    const imgs = [];
    const scan = () => {
      for (const img of $$('main img')) {
        const w = img.getBoundingClientRect().width;
        // full-bleed background art is left alone: nothing to see, a lot to filter
        if (img._bpLq || skip(img) || w < 240 || w > 1000 || getComputedStyle(img).filter !== 'none') continue;
        img._bpLq = true;
        imgs.push(img);
      }
    };
    scan();
    let raf = 0;
    addEventListener('pointermove', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const hit = imgs.find(img => { const r = img.getBoundingClientRect(); return mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom; }) || null;
        if (hit === cur) return;
        if (cur) cur.removeAttribute('data-bp-liquid');
        cur = hit;
        if (cur) {
          cur.dataset.bpLiquid = '';
          if (!running) { running = true; requestAnimationFrame(loop); }
        }
      });
    }, { passive: true });
    return scan;
  }

  // which edge of r is nearest to (x, y)
  const edge = (r, x, y) => {
    const d = { left: x - r.left, right: r.right - x, top: y - r.top, bottom: r.bottom - y };
    return Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
  };
  const POS = { left: 'left center', right: 'right center', top: 'center top', bottom: 'center bottom' };
  const REST = { left: '0% 100%', right: '0% 100%', top: '100% 0%', bottom: '100% 0%' };
  function directional() {
    for (const el of $$('main a, main button, nav a')) {
      if (el._bpDir || skip(el) || el.closest('#bp-hero') || el.matches('.bg-primary-800')) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.height < 28 || r.height > 64 || r.width > 320 || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) < 1 || !el.textContent.trim()) continue;
      el._bpDir = true;
      el.dataset.bpDir = '';
      el.addEventListener('pointerenter', e => {
        const side = edge(el.getBoundingClientRect(), e.clientX, e.clientY);
        // jump (unseen, while empty) to the entry side's resting size, then fill
        el.style.transition = 'none';
        el.style.setProperty('--bp-dp', POS[side]);
        el.style.setProperty('--bp-ds', REST[side]);
        void el.offsetWidth;
        el.style.removeProperty('transition');
        el.style.setProperty('--bp-ds', '100% 100%');
      });
      el.addEventListener('pointerleave', e => {
        const side = edge(el.getBoundingClientRect(), e.clientX, e.clientY);
        // moving the anchor while full is invisible; then it drains out that side
        el.style.setProperty('--bp-dp', POS[side]);
        el.style.setProperty('--bp-ds', REST[side]);
      });
    }
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    directional();
    decode();
    compass();
    strings();
    peel();
    const scanImages = liquidImages();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; directional(); decode(); peel(); scanImages(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  // after theme.js (load + 600ms) and motion.js (load + 900ms)
  window.addEventListener('load', () => setTimeout(start, 1100));
  setTimeout(start, 5000);
})();
