// Pointer interactions for version 4 on GSAP (Draggable + InertiaPlugin, served
// by server.js from node_modules); styles in theme.css:
//  - a trail of silver stars follows the mouse, a click bursts into stars;
//  - hero headline words lift and glow silver as the mouse passes near them;
//  - the hero feature chips and proof badges can be thrown and spring back;
//  - cards squash when pressed and bounce back on release;
//  - clipped images zoom a little and pan towards the cursor;
//  - a moon button bottom-left waxes from crescent to full as you scroll, and
//    flies you back to the top when clicked.
// The only new nodes are a fixed, click-through effects layer and the moon
// button, both appended to <body> outside React's tree.
(function () {
  if (!window.gsap) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  if (window.Draggable) gsap.registerPlugin(Draggable, window.InertiaPlugin);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const skip = el => el.closest('#bp-hero, [class*="marquee"], [class*="embla"]');
  let fx;

  function star(x, y, size) {
    const s = document.createElement('i');
    s.className = 'bp-star';
    s.style.width = s.style.height = size + 'px';
    fx.appendChild(s);
    gsap.set(s, { x: x - size / 2, y: y - size / 2, scale: 0, rotation: gsap.utils.random(-45, 45) });
    return s;
  }

  function trail() {
    let lx = 0, ly = 0, lt = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || fx.childElementCount > 40) return;
      const now = performance.now();
      if (Math.hypot(e.clientX - lx, e.clientY - ly) < 28 || now - lt < 35) return;
      lx = e.clientX; ly = e.clientY; lt = now;
      const s = star(e.clientX, e.clientY, gsap.utils.random(6, 12));
      gsap.timeline({ onComplete: () => s.remove() })
        .to(s, { scale: 1, duration: .2, ease: 'back.out(3)' })
        .to(s, { y: '+=' + gsap.utils.random(18, 40), rotation: '+=180', scale: .2, opacity: 0, duration: .9, ease: 'power1.in' });
    }, { passive: true });
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + gsap.utils.random(-.25, .25), d = gsap.utils.random(40, 95);
      const s = star(x, y, gsap.utils.random(7, 14));
      gsap.timeline({ onComplete: () => s.remove() })
        .to(s, { x: '+=' + Math.cos(a) * d, y: '+=' + Math.sin(a) * d, scale: 1, rotation: '+=' + gsap.utils.random(90, 270), duration: .7, ease: 'power3.out' })
        .to(s, { opacity: 0, scale: .3, y: '+=14', duration: .45, ease: 'power1.in' }, '-=.25');
    }
  }

  function clicks() {
    addEventListener('click', e => {
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      burst(e.clientX, e.clientY, 12);
    });
  }

  // hero headline: each word lifts and glows by how close the mouse is
  function heroWords() {
    const box = document.querySelector('#bp-hero .bph-box'), h1 = document.querySelector('#bp-hero h1');
    if (!box || !h1) return;
    const texts = [];
    const walk = n => { for (const c of [...n.childNodes]) c.nodeType === 3 ? texts.push(c) : walk(c); };
    walk(h1);
    for (const t of texts) {
      const frag = document.createDocumentFragment();
      for (const part of t.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
        const w = document.createElement('span');
        w.className = 'bp-w';
        w.textContent = part;
        frag.appendChild(w);
      }
      t.replaceWith(frag);
    }
    const words = $$('.bp-w', h1).map(el => ({ el, y: gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' }), g: gsap.quickTo(el, '--bp-glow', { duration: .5, ease: 'power3' }) }));
    let raf = 0, mx = 0, my = 0;
    const update = () => {
      raf = 0;
      for (const w of words) {
        const r = w.el.getBoundingClientRect();
        const k = Math.max(0, 1 - Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2)) / 150);
        w.y(-k * 12);
        w.g(k);
      }
    };
    box.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(update); });
    box.addEventListener('pointerleave', () => { for (const w of words) { w.y(0); w.g(0); } });
  }

  // throw the hero chips around; they spring home
  function throwables() {
    if (!window.Draggable || !fine) return;
    for (const el of $$('#bp-hero .bph-feature, #bp-hero .bph-proof > div')) {
      const ready = () => {
        // the CSS entrance animation would otherwise win over GSAP's inline transform
        el.style.animation = 'none';
        el.style.opacity = '1';
        el.dataset.bpThrow = '';
        const home = function () { gsap.to(this.target, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.3, ease: 'elastic.out(1, .4)' }); };
        Draggable.create(el, {
          type: 'x,y', inertia: !!window.InertiaPlugin, zIndexBoost: true,
          onPress() { gsap.to(this.target, { scale: 1.06, duration: .2 }); },
          onDrag() { gsap.to(this.target, { rotation: gsap.utils.clamp(-12, 12, this.deltaX * 1.5), duration: .3 }); },
          onRelease() { if (!this.tween) home.call(this); },
          onThrowComplete: home,
        });
      };
      const running = el.getAnimations().filter(a => a.playState === 'running');
      if (running.length) Promise.all(running.map(a => a.finished)).then(ready, ready); else ready();
    }
  }

  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-2xl[class*="bg-gradient"], main .rounded-xl.bg-white';
  function squash() {
    for (const c of $$(CARDS)) {
      if (c._bpSq || skip(c)) continue;
      c._bpSq = true;
      // leave a card that is still flipping in to its CSS transition
      const up = () => { if (c._gsap && !c.hasAttribute('data-bp-flip')) gsap.to(c, { scale: 1, duration: .9, ease: 'elastic.out(1, .35)' }); };
      c.addEventListener('pointerdown', () => { if (!c.hasAttribute('data-bp-flip')) gsap.to(c, { scale: .97, duration: .15, ease: 'power2.out' }); });
      c.addEventListener('pointerup', up);
      c.addEventListener('pointerleave', up);
    }
  }

  function imagePan() {
    if (!fine) return;
    for (const img of $$('main img')) {
      if (img._bpPan || skip(img)) continue;
      const r = img.getBoundingClientRect(), box = img.parentElement;
      if (r.width < 240 || getComputedStyle(box).overflow === 'visible') continue;
      const cs = getComputedStyle(img);
      if (cs.transform !== 'none' && !img._gsap) continue;
      img._bpPan = true;
      const qx = gsap.quickTo(img, 'x', { duration: .8, ease: 'power3' }), qy = gsap.quickTo(img, 'y', { duration: .8, ease: 'power3' });
      const qs = gsap.quickTo(img, 'scale', { duration: .8, ease: 'power3' });
      box.addEventListener('pointermove', e => {
        const b = box.getBoundingClientRect();
        qx(((e.clientX - b.left) / b.width - .5) * -b.width * .04);
        qy(((e.clientY - b.top) / b.height - .5) * -b.height * .04);
        qs(1.06);
      });
      box.addEventListener('pointerleave', () => { qx(0); qy(0); qs(1); });
    }
  }

  function moon() {
    const sc = document.getElementById('page-scroller') || document.scrollingElement;
    const btn = document.createElement('button');
    btn.className = 'bp-moon';
    btn.type = 'button';
    btn.title = 'Back to top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i></i>';
    document.body.appendChild(btn);
    const update = () => {
      const max = sc.scrollHeight - sc.clientHeight, p = max > 0 ? sc.scrollTop / max : 0;
      btn.style.setProperty('--bp-phase', (.12 + p * .88).toFixed(3));
      if (sc.scrollTop > 400) btn.dataset.show = ''; else btn.removeAttribute('data-show');
    };
    (sc === document.scrollingElement ? window : sc).addEventListener('scroll', update, { passive: true });
    update();
    btn.addEventListener('click', () => {
      gsap.to(sc, { scrollTop: 0, duration: reduced ? 0 : 1.4, ease: 'power3.inOut' });
      gsap.fromTo(btn, { rotation: 0 }, { rotation: -360, duration: 1.2, ease: 'power3.inOut' });
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    moon();
    if (reduced) return;
    fx = document.createElement('div');
    fx.id = 'bp-fx';
    document.body.appendChild(fx);
    if (fine) trail();
    clicks();
    heroWords();
    throwables();
    squash();
    imagePan();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; squash(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  // after theme.js (load + 600ms) and motion.js (load + 900ms)
  window.addEventListener('load', () => setTimeout(start, 1100));
  setTimeout(start, 5000);
})();
