// Site-wide motion for version 2 (styles in theme.css), injected into every
// HTML page by server.js:
//  - the background spotlight follows the mouse (--bp-mx/--bp-my on <html>);
//  - headings rise in word by word as they scroll into view, then go back to
//    their original text nodes, so React and content.js still own them;
//    gradient-text headings get flowing colour instead (splitting would break
//    their background-clip);
//  - cards tilt in 3D towards the mouse.
// Like content.js it waits for React to hydrate, and it only sets data
// attributes and custom properties, never class names.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEADINGS = 'main h1, main h2';
  const CARDS = 'main .rounded-2xl.bg-white:not(.py-16), main .rounded-3xl.bg-white';

  // spotlight
  let mx = 0, my = 0, queued = false;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.documentElement.style.setProperty('--bp-mx', mx + 'px');
      document.documentElement.style.setProperty('--bp-my', my + 'px');
    });
  }, { passive: true });

  const isClipText = el => /text/.test(getComputedStyle(el).backgroundClip || getComputedStyle(el).webkitBackgroundClip || '');

  // Words are drawn from a data attribute (::before), not as text nodes, so
  // content.js's text swapping never sees single words while they animate.
  function split(h) {
    const parts = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) if (n.data.trim()) nodes.push(n);
    let i = 0;
    for (const node of nodes) {
      const added = [];
      for (const tok of node.data.split(/(\s+)/)) {
        if (!tok) continue;
        let el;
        if (/^\s+$/.test(tok)) el = document.createTextNode(tok);
        else {
          el = document.createElement('span');
          el.className = 'bp-w';
          el.dataset.w = tok;
          el.setAttribute('aria-hidden', 'true');
          el.style.setProperty('--i', i++);
        }
        node.parentNode.insertBefore(el, node);
        added.push(el);
      }
      const parent = node.parentNode;
      parent.removeChild(node);
      parts.push({ node, parent, added });
    }
    h.setAttribute('aria-label', h.textContent.trim() || nodes.map(x => x.data).join(''));
    return { parts, count: i };
  }

  function restore(h, { parts }) {
    for (const { node, parent, added } of parts) {
      if (!added[0] || added[0].parentNode !== parent) continue;
      parent.insertBefore(node, added[0]);
      for (const el of added) el.remove();
    }
    h.removeAttribute('data-bp-words');
    h.removeAttribute('aria-label');
  }

  function headings() {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const h = e.target;
        io.unobserve(h);
        h.dataset.bpWords = 'in';
        const s = h._bpSplit;
        setTimeout(() => restore(h, s), s.count * 45 + 900);
      }
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

    for (const h of document.querySelectorAll(HEADINGS)) {
      if (h.closest('#bp-hero') || h.dataset.bpWords) continue;
      const clip = [h, ...h.querySelectorAll('*')].find(isClipText);
      if (clip) { clip.dataset.bpFlow = ''; continue; }
      if (reduced) continue;
      h._bpSplit = split(h);
      h.dataset.bpWords = 'wait';
      io.observe(h);
    }
  }

  function tilt(card) {
    card.dataset.bpTilt = '';
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--bp-ry', ((x - .5) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--bp-rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      card.style.setProperty('--bp-gx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--bp-gy', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--bp-rx', '0deg');
      card.style.setProperty('--bp-ry', '0deg');
    });
  }

  function cards() {
    for (const c of document.querySelectorAll(CARDS)) {
      if (c.dataset.bpTilt !== undefined || c.closest('#bp-hero') || c.parentElement.closest('[data-bp-tilt]')) continue;
      // leave cards that already have their own transform alone
      if (getComputedStyle(c).transform !== 'none') continue;
      tilt(c);
    }
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    headings();
    if (reduced) return;
    cards();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; cards(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  window.addEventListener('load', () => setTimeout(start, 600));
  setTimeout(start, 4500);
})();
