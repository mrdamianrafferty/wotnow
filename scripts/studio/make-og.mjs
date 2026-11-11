// Renders the Daisy Studio share images (1200x630) into public/studio/og/.
// Usage, from the repo root: node scripts/studio/make-og.mjs
// Uses the Playwright Chromium that ships with @playwright/test.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd());
const img = (id, ext = 'webp') => pathToFileURL(`${ROOT}/public/studio/img/${id}.${ext}`).href;
const font = (f) => pathToFileURL(`${ROOT}/public/fonts/daisy-serif/${f}`).href;

const ICONS = {
  rise: img('80d96310a8d6eb7a753cf1dd4b8e3d2f'),
  findr: img('adfe740f91fb4492db0b5374fec97de9'),
  flycast: img('450f98912f3eaf0194a92ead6ce9a813'),
  grewp: img('0379e9047f14ba0fa2dbc4e05d25c366'),
  hungerford: img('3eefe8e233f51bd6dc2161cb57705490'),
  godaisy: img('c3bc841d80a1a02ab2bbec250d95afa1'),
  grow: img('bf87f94bfbe571f892e3c66b9fcf2fb1'),
  kitten: img('765cdd9de27bc994e8125d0da9dc1e8f'),
};

// Case studies: the app's own colour, icon, name and the line under its name on the page.
const CASES = [
  ['rise-daisy', '#0c6231', ICONS.rise, 'Rise Daisy', 'Treats a river as something you calculate, not a weather pin.'],
  ['hungerford-fishery', '#164e63', ICONS.hungerford, 'Hungerford Fishery', "A members' app for a historic chalk stream, built around how the club actually runs."],
  ['findr', '#0e7490', ICONS.findr, 'Findr', 'Which sea fish are likely feeding on your coast today, and why.'],
  ['fly-cast-coach', '#22d3ee', ICONS.flycast, 'Fly Cast Coach', 'Your phone becomes a practice fly rod.'],
  ['grewp', '#18b254', ICONS.grewp, 'Grewp', 'Finds you something to do, helps you go with people, and makes it easy to put on your own.'],
  ['go-daisy', '#475569', ICONS.godaisy, 'Go Daisy', 'One sentence a day: what today is good for, where you are.'],
  ['grow-daisy', '#73e2a0', ICONS.grow, 'Grow Daisy', "A gardener leaning over the gate: your forecast becomes the week's garden jobs."],
  ['kitten-bingo', '#f7a8c4', ICONS.kitten, 'Kitten Bingo', 'Cosy picture bingo in a Japanese neko café, where every win spoils a kitten.'],
];

// Pages without an app of their own: their headline over the row of icons.
const PAGES = [
  ['build', 'Build your app', 'Your own app, built by people who ship them.', 'Clubs, fisheries and outdoor organisations: web, iPhone and Android.'],
  ['partner', 'Partner with us', 'Be there when people decide to go out.', 'Reach anglers, gardeners and people who go outside, beside the answer they came for.'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const shell = (bar, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Daisy Serif";src:url("${font('DaisySerif-Regular.woff2')}") format("woff2");font-weight:400}
@font-face{font-family:"Daisy Serif";src:url("${font('DaisySerif-Italic.woff2')}") format("woff2");font-weight:400;font-style:italic}
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:630px;background:#faf8f5;color:#1c1917;font-family:"Daisy Serif",Georgia,serif;position:relative;overflow:hidden}
.bar{position:absolute;top:0;left:0;right:0;height:12px;background:${bar}}
.eyebrow{font-style:italic;font-variant-caps:small-caps;font-size:28px;letter-spacing:.04em;color:#57534e;margin:0}
h1{font-weight:400;margin:0;line-height:1.08}
.sub{color:#44403c;margin:0}
.icon{border-radius:22%;border:1px solid #e7e5e4;background:#fff;object-fit:cover}
</style></head><body><div class="bar"></div>${body}</body></html>`;

const casePage = ([, color, icon, name, line]) =>
  shell(
    color,
    `<div style="position:absolute;left:80px;top:96px;right:80px;display:flex;gap:64px;align-items:center;height:440px">
      <div style="flex:1;display:flex;flex-direction:column;gap:22px;min-width:0">
        <p class="eyebrow">Daisy Studio · case study</p>
        <h1 style="font-size:84px">${esc(name)}</h1>
        <p class="sub" style="font-size:36px;line-height:1.3">${esc(line)}</p>
      </div>
      <img class="icon" src="${icon}" style="width:280px;height:280px;flex:none;box-shadow:0 12px 32px rgba(28,25,23,.12)">
    </div>`,
  );

const plainPage = ([, eyebrow, headline, line]) =>
  shell(
    '#3d6b4f',
    `<div style="position:absolute;left:80px;top:92px;right:80px;display:flex;flex-direction:column;gap:22px">
      <p class="eyebrow">Daisy Studio · ${esc(eyebrow)}</p>
      <h1 style="font-size:72px;max-width:980px">${esc(headline)}</h1>
      <p class="sub" style="font-size:32px;line-height:1.3;max-width:980px">${esc(line)}</p>
      <div style="display:flex;gap:22px;margin-top:18px">${Object.values(ICONS)
        .map((src) => `<img class="icon" src="${src}" style="width:104px;height:104px">`)
        .join('')}</div>
    </div>`,
  );

mkdirSync(`${ROOT}/public/studio/og`, { recursive: true });
// Load each card from a file so its file:// fonts and icons are allowed to load.
const TMP = resolve(tmpdir(), 'daisy-studio-og.html');
async function render(page, html, out) {
  writeFileSync(TMP, html);
  await page.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${ROOT}/public/studio/og/${out}.png` });
  console.log('wrote', out);
}

// Use the installed Google Chrome, so no Playwright browser download is needed.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of CASES) await render(page, casePage(c), c[0]);
for (const p of PAGES) await render(page, plainPage(p), p[0]);
await browser.close();
rmSync(TMP, { force: true });
