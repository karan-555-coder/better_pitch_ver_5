// Scroll-driven motion for version 5 on GSAP + ScrollTrigger (served by
// server.js from node_modules), on top of theme.js:
//  - headings come in rippled (an SVG distortion) and calm down until still;
//  - cards surface one after another, rising and coming into focus;
//  - logos in the marquees bob like they are floating;
//  - the page background takes on a faint lime tint as you scroll down.
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
  const SVG = 'http://www.w3.org/2000/svg';

  function ripples() {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(svg);
    let n = 0;
    for (const h of $$('main h1, main h2')) {
      if (skip(h) || !below(h) || getComputedStyle(h).filter !== 'none') continue;
      const id = 'bp-ripple-' + n++;
      gsap.set(h, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: h, start: 'top 88%', once: true,
        onEnter() {
          // one filter per heading, so each ripple calms on its own
          const f = document.createElementNS(SVG, 'filter');
          f.id = id;
          f.setAttribute('x', '-10%'); f.setAttribute('y', '-30%');
          f.setAttribute('width', '120%'); f.setAttribute('height', '160%');
          f.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency="0.008 0.05" numOctaves="2" seed="${n}" result="n"/>` +
            '<feDisplacementMap in="SourceGraphic" in2="n" scale="45" xChannelSelector="R" yChannelSelector="G"/>';
          svg.appendChild(f);
          const turb = f.firstChild, disp = f.lastChild, st = { s: 45, fy: .05 };
          h.style.filter = `url(#${id})`;
          gsap.timeline({ onComplete() { h.style.removeProperty('filter'); f.remove(); } })
            .to(h, { autoAlpha: 1, duration: .6, ease: 'power1.out', clearProps: 'opacity,visibility' }, 0)
            .to(st, {
              s: 0, fy: .01, duration: 1.8, ease: 'power2.out',
              onUpdate() { disp.setAttribute('scale', st.s.toFixed(1)); turb.setAttribute('baseFrequency', `0.008 ${st.fy.toFixed(4)}`); },
            }, 0);
        },
      });
    }
  }

  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white, main .rounded-2xl[class*="bg-gradient"], main .rounded-xl.bg-white';
  function surface() {
    const cards = $$(CARDS).filter(c => !skip(c) && below(c) && free(c) && !c.parentElement.closest(CARDS));
    if (!cards.length) return;
    gsap.set(cards, { y: 70, scale: .96, autoAlpha: 0, filter: 'blur(8px)' });
    ScrollTrigger.batch(cards, {
      start: 'top 92%', once: true,
      onEnter: batch => gsap.to(batch, {
        y: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 1.1, ease: 'sine.out', stagger: .12,
        clearProps: 'transform,opacity,visibility,filter',
      }),
    });
  }

  function bob() {
    $$('[class*="marquee"] img, [class*="marquee"] svg').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (!r.width || r.width > 220 || !free(el)) return;
      gsap.to(el, { y: -5, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: (i % 8) * .2 });
    });
  }

  function depth() {
    const main = document.querySelector('main');
    if (!main) return;
    gsap.fromTo(main, { '--color-secondary-light-ivory': 'rgb(247,247,244)' }, {
      '--color-secondary-light-ivory': 'rgb(238,241,229)', ease: 'none',
      scrollTrigger: { trigger: main, start: 'top top', end: 'bottom bottom', scrub: true },
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    // The page scrolls inside #page-scroller, not the window.
    const sc = document.getElementById('page-scroller');
    if (sc) ScrollTrigger.defaults({ scroller: sc });
    ripples();
    surface();
    bob();
    depth();
    ScrollTrigger.refresh();
  }
  // theme.js starts at load + 600ms; this goes after it
  window.addEventListener('load', () => setTimeout(start, 900));
  setTimeout(start, 4800);
})();
