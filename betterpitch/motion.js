// Scroll-driven motion for version 4 on GSAP + ScrollTrigger (served by
// server.js from node_modules), on top of theme.js:
//  - hero: copy, panel and tile grid drift apart while you scroll away, the
//    box settles back a little, the tiles follow the mouse and the play orb floats;
//  - dark sections open as a growing moon circle, scrubbed with the scroll;
//  - a moonlight beam sweeps across the big white panels as you scroll past;
//  - images lean with the scroll speed and the logo marquees speed up with it;
//  - small icons orbit in with a spring, footer links rise in one by one.
// It only animates elements that have no transform of their own and starts
// after theme.js, so the two layers never fight over the same property.
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const below = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= innerHeight; };
  const free = el => { const cs = getComputedStyle(el); return cs.transform === 'none' && cs.translate === 'none' && cs.animationName === 'none'; };
  const skip = el => el.closest('#bp-hero, [class*="marquee"], [class*="embla"]');

  function hero() {
    const box = document.querySelector('#bp-hero .bph-box');
    if (!box) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#bp-hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    tl.to(box, { scale: .95, transformOrigin: '50% 0%', ease: 'none' }, 0)
      .to('#bp-hero .bph-copy', { y: -90, opacity: .35, ease: 'none' }, 0)
      .to('#bp-hero .bph-panel', { y: -40, ease: 'none' }, 0)
      .to('#bp-hero .bph-tiles', { yPercent: 12, ease: 'none' }, 0)
      .to('#bp-hero .bph-features', { y: -30, ease: 'none' }, 0);
    // tiles lean towards the mouse
    const tiles = box.querySelector('.bph-tiles');
    if (tiles) {
      const qx = gsap.quickTo(tiles, 'x', { duration: 1.2, ease: 'power3' });
      const qy = gsap.quickTo(tiles, 'y', { duration: 1.2, ease: 'power3' });
      box.addEventListener('pointermove', e => {
        const r = box.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width - .5) * -24);
        qy(((e.clientY - r.top) / r.height - .5) * -16);
      });
      box.addEventListener('pointerleave', () => { qx(0); qy(0); });
    }
    gsap.to('#bp-hero .bph-orb-wrap', { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  function moonSections() {
    for (const el of $$('[data-bp-stars]')) {
      if (el.tagName === 'FOOTER' || !below(el)) continue;
      gsap.fromTo(el, { clipPath: 'circle(22% at 50% 18%)' }, {
        clipPath: 'circle(150% at 50% 18%)', ease: 'power1.in',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: .5 },
      });
    }
  }

  function beams() {
    for (const el of $$('main .bg-white.rounded-2xl.py-16')) {
      gsap.fromTo(el, { '--bp-beam': '-15%' }, {
        '--bp-beam': '115%', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  }

  function velocity() {
    const imgs = $$('main img').filter(img => !skip(img) && img.getBoundingClientRect().width >= 200 && free(img));
    const setters = imgs.map(img => gsap.quickSetter(img, 'skewY', 'deg'));
    const marquees = () => $$('[class*="marquee"] *').flatMap(el => el.getAnimations());
    const proxy = { skew: 0, rate: 1 };
    const apply = () => {
      for (const s of setters) s(proxy.skew);
      for (const a of marquees()) a.playbackRate = proxy.rate;
    };
    imgs.forEach(img => gsap.set(img, { transformOrigin: '50% 50%', force3D: true }));
    ScrollTrigger.create({
      onUpdate: self => {
        const v = self.getVelocity();
        const skew = gsap.utils.clamp(-4, 4, v / -400);
        const rate = 1 + Math.min(4, Math.abs(v) / 500);
        if (Math.abs(skew) > Math.abs(proxy.skew) || rate > proxy.rate) {
          proxy.skew = skew;
          proxy.rate = rate;
          gsap.to(proxy, { skew: 0, rate: 1, duration: .8, ease: 'power3', overwrite: true, onUpdate: apply });
        }
      },
    });
  }

  function icons() {
    const els = $$('main img, main svg').filter(el => {
      if (skip(el) || el.closest('a, button') || !below(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 20 && r.width <= 90 && r.height <= 90 && free(el);
    });
    if (!els.length) return;
    gsap.set(els, { scale: 0, rotation: -120, autoAlpha: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, { scale: 1, rotation: 0, autoAlpha: 1, duration: .9, ease: 'back.out(2)', stagger: .08, clearProps: 'transform,opacity,visibility' }),
    });
  }

  function footer() {
    const els = $$('footer a, footer h2, footer h3, footer h4').filter(el => below(el) && free(el));
    if (!els.length) return;
    gsap.set(els, { y: 24, autoAlpha: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 95%', once: true,
      onEnter: batch => gsap.to(batch, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out', stagger: .03, clearProps: 'transform,opacity,visibility' }),
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    // The page scrolls inside #page-scroller, not the window.
    const sc = document.getElementById('page-scroller');
    if (sc) ScrollTrigger.defaults({ scroller: sc });
    hero();
    moonSections();
    beams();
    velocity();
    icons();
    footer();
    ScrollTrigger.refresh();
  }
  // theme.js starts at load + 600ms; this goes after it
  window.addEventListener('load', () => setTimeout(start, 900));
  setTimeout(start, 4800);
})();
