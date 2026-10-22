// Gen Z layer for version 5 (styles in theme.css), on GSAP:
//  - headings glitch (an RGB split that jitters) when hovered, and a
//    hand-drawn lime scribble draws itself under their last line;
//  - cards go neo-brutalist on hover: they hop up-left onto a hard lime block shadow;
//  - CTA buttons stream emoji reactions upwards while hovered, like a live stream;
//  - small pills and badges ("New", "Soon", proof badges...) wiggle like stickers.
// The film grain over the page is pure CSS (html::after in theme.css).
// The only new node is a click-through layer for the emoji, appended to <body>.
(function () {
  if (!window.gsap) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const skip = el => el.closest('[class*="marquee"], [class*="embla"]');
  const noAfter = el => getComputedStyle(el, '::after').content === 'none';

  function headings() {
    for (const h of $$('main h1, main h2')) {
      if (h._bpGz || skip(h)) continue;
      h._bpGz = true;
      h.addEventListener('pointerenter', () => {
        if (h.dataset.bpGlitch !== undefined) return;
        h.dataset.bpGlitch = '';
        h.addEventListener('animationend', () => h.removeAttribute('data-bp-glitch'), { once: true });
      });
      const cs = getComputedStyle(h);
      if ((cs.position !== 'static' && cs.position !== 'relative') || !noAfter(h)) continue;
      // the scribble goes under the last line of text, not the whole box
      const place = () => {
        const range = document.createRange();
        range.selectNodeContents(h);
        const rects = [...range.getClientRects()].filter(r => r.width > 2);
        if (!rects.length) return;
        const last = rects.reduce((a, r) => (r.bottom > a.bottom + 2 ? r : a)), box = h.getBoundingClientRect();
        const line = rects.filter(r => Math.abs(r.bottom - last.bottom) < 4);
        const left = Math.min(...line.map(r => r.left)), right = Math.max(...line.map(r => r.right));
        h.style.setProperty('--bp-sl', (left - box.left).toFixed(0) + 'px');
        h.style.setProperty('--bp-sw', (right - left).toFixed(0) + 'px');
      };
      h.dataset.bpScribble = '';
      h.addEventListener('pointerenter', place);
    }
  }

  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-xl.bg-white, main .rounded-2xl[class*="bg-gradient"]';
  function brutal() {
    for (const c of $$(CARDS)) {
      if (c.dataset.bpBrutal !== undefined || skip(c) || c.parentElement.closest(CARDS)) continue;
      c.dataset.bpBrutal = '';
    }
  }

  let fx;
  const EMOJI = ['💚', '🔥', '✨', '⚡', '🚀', '💯', '🫶'];
  function reactions() {
    for (const b of $$('a.bg-primary-800, button.bg-primary-800, #bp-hero .bph-btn, nav a[class*="border"]')) {
      if (b._bpRx) continue;
      b._bpRx = true;
      let timer = 0;
      const spawn = () => {
        if (fx.childElementCount > 28) return;
        const r = b.getBoundingClientRect(), e = document.createElement('i');
        e.className = 'bp-emoji';
        e.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
        e.style.fontSize = gsap.utils.random(16, 26) + 'px';
        fx.appendChild(e);
        gsap.set(e, { x: gsap.utils.random(r.left + 8, r.right - 20), y: r.top - 6, scale: 0, rotation: gsap.utils.random(-25, 25) });
        gsap.timeline({ onComplete: () => e.remove() })
          .to(e, { scale: 1, duration: .25, ease: 'back.out(3)' })
          .to(e, { y: '-=' + gsap.utils.random(90, 160), x: '+=' + gsap.utils.random(-40, 40), rotation: '+=' + gsap.utils.random(-40, 40), duration: gsap.utils.random(1.1, 1.6), ease: 'power1.out' }, 0)
          .to(e, { autoAlpha: 0, scale: .7, duration: .4, ease: 'power1.in' }, '>-0.45');
      };
      b.addEventListener('pointerenter', () => { spawn(); clearInterval(timer); timer = setInterval(spawn, 140); });
      b.addEventListener('pointerleave', () => clearInterval(timer));
      b.addEventListener('click', () => { for (let i = 0; i < 6; i++) setTimeout(spawn, i * 40); });
    }
  }

  function stickers() {
    // pill-shaped: fully rounded, short and filled ("Soon", "Hiring", the "New ..." announcement link)
    const pills = $$('main span, main div, main a, nav span, footer span, footer div').filter(el => {
      if (el.children.length > 3 || skip(el)) return false;
      const t = el.textContent.trim(), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return t.length >= 2 && t.length <= 60 && r.height >= 14 && r.height <= 48 && r.width <= 520 &&
        parseFloat(cs.borderTopLeftRadius) >= r.height / 2 - 1 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    for (const el of [...pills, ...$$('#bp-hero .bph-pill, #bp-hero .bph-proof > div')]) el.dataset.bpSticker = '';
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    fx = document.createElement('div');
    fx.id = 'bp-fx';
    document.body.appendChild(fx);
    headings();
    brutal();
    reactions();
    stickers();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; brutal(); reactions(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  // after theme.js, motion.js and interact.js
  window.addEventListener('load', () => setTimeout(start, 1300));
  setTimeout(start, 5200);
})();
