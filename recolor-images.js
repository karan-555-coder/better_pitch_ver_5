// Moves purple in the archived raster images (WebP/PNG/JPEG) to the BetterPitch
// midnight navy & silver (version 4), the same mapping server.js applies to CSS/HTML
// colours. Only purple pixels change (hue 235-340); skin, greys, black and
// white stay as they are.
// Results go to archive/recolored/<file>; the originals are left untouched and
// server.js serves the recoloured copy when one exists.
// Usage: node recolor-images.js   (re-run after a capture)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ARCHIVE = path.join(__dirname, 'archive');
const OUT = path.join(ARCHIVE, 'recolored');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const manifest = JSON.parse(fs.readFileSync(path.join(ARCHIVE, 'manifest.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// Runs in the browser: decode, shift purple pixels, re-encode in the same format.
async function recolorInPage(dataUrl, type) {
  const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, img.width, img.height), d = im.data;
  const f = (n, h, s, l) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  let changed = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn) continue;
    const dd = mx - mn, l = (mx + mn) / 2, s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    let h = (mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4) * 60;
    // Soft edges on hue and saturation so there is no visible seam in gradients/photos.
    const w = Math.min(1, Math.max(0, (h - 235) / 15), Math.max(0, (340 - h) / 15)) * Math.min(1, Math.max(0, (s - .08) / .1));
    if (w <= 0) continue;
    // same mapping as toTheme() in server.js: dark/mid -> navy and sapphire, light -> icy silver
    const t = Math.min(1, Math.max(0, (l - .6) / .2));
    const nh = 218 + (Math.min(335, Math.max(240, h)) - 240) * .05;
    const sd = Math.max(.35, Math.min(s, .85) * .85), sl = Math.min(s, .4) * .55;
    const ns = sd + (sl - sd) * t, nl = l * .85 + (l - l * .85) * t;
    d[i] += (f(0, nh, ns, nl) - d[i]) * w;
    d[i + 1] += (f(8, nh, ns, nl) - d[i + 1]) * w;
    d[i + 2] += (f(4, nh, ns, nl) - d[i + 2]) * w;
    changed++;
  }
  if (changed < 50) return null;
  ctx.putImageData(im, 0, 0);
  const blob = await c.convertToBlob({ type, quality: .9 });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
  return btoa(bin);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const files = [...new Map(Object.values(manifest)
    .filter((e) => /^image\/(webp|png|jpeg)$/.test(e.type))
    .map((e) => [e.file, e])).values()];
  let done = 0, skipped = 0;
  for (const e of files) {
    const buf = fs.readFileSync(path.join(ARCHIVE, 'files', e.file));
    // Animated WebP would lose its animation on re-encode.
    if (e.type === 'image/webp' && buf.includes('ANIM')) { skipped++; continue; }
    const out = await page.evaluate(recolorInPage, `data:${e.type};base64,${buf.toString('base64')}`, e.type).catch(() => null);
    if (out) { fs.writeFileSync(path.join(OUT, e.file), Buffer.from(out, 'base64')); done++; }
  }
  await browser.close();
  console.log(`${files.length} images: ${done} recoloured, ${skipped} animated skipped, rest had no purple`);
})();
