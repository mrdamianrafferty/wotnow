/**
 * Capture and compose Go Daisy's iPhone App Store screenshots.
 *
 *   npx tsx scripts/capture-app-store-screenshots.ts
 *
 * 1320 × 2868, the 6.9" iPhone size App Store Connect asks for first (it
 * scales them down for smaller iPhones). Each one is a real screen from the
 * live app, captured at phone size, set in the drawn-page style: a handwritten
 * caption on paper above, the screen in an outline phone below. The iOS app
 * loads godaisy.io, so these are the screens it shows.
 *
 * The set leads with the call, then "Why?" and the drawn conditions page, a
 * drawing per kind of weather, and onboarding. The drawings follow the call:
 * after a land day the land ones come first and the sea last, so the waves
 * never sit beside a cycling or walking call. Each drawing is taken at a
 * place where it has something to show: the sea at Gijón, the wind in the
 * Peak District, the ground on Hackney Marshes, rain in Edinburgh.
 *
 * The weather is whatever it is today. The script walks the week and leads
 * with the best day, but look at every image before uploading it.
 *
 * iPad: DEVICE=ipad renders the same seven at 2064 × 2752 (13" iPad, the
 * size App Store Connect requires), the screen captured at iPad width and set
 * in an outline tablet. DEVICE=duo does the same at 2007 × 2853, the iPhone
 * Duo open.
 *
 * Env overrides:
 *   DEVICE         iphone (default), ipad or duo
 *   BASE_URL       default https://godaisy.io
 *   OUT_DIR        default store-assets/godaisy/app-store
 *   CHROMIUM_PATH  a Chromium binary, if Playwright's own is not installed
 */

import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'https://godaisy.io';
const OUT_DIR = process.env.OUT_DIR ?? path.join('store-assets', 'godaisy', 'app-store');

/** Same shape as `CallSetup` in lib/godaisy/call/setup.ts. */
const SETUP = {
  v: 1,
  sports: ['hiking', 'surfing', 'road_cycling', 'picnicking', 'stargazing'],
  place: { name: 'Oviedo', lat: 43.3614, lon: -5.8494, country: 'Spain' },
  coastal: { name: 'Gijón', lat: 43.5453, lon: -5.6619, country: 'Spain' },
  hour: 7,
};

const SPOTS = {
  gijon: { n: 'Gijón', lat: 43.5453, lon: -5.6619, c: true },
  edale: { n: 'Edale', lat: 53.3706, lon: -1.8167, c: false },
  hackney: { n: 'Hackney Marshes', lat: 51.5565, lon: -0.0306, c: false },
  edinburgh: { n: 'Edinburgh', lat: 55.9533, lon: -3.1883, c: false },
};

/**
 * Per device: the viewport the app is captured at, and the canvas it is set
 * on. Canvas × scale is the App Store size.
 */
const DEVICES = {
  // 366 CSS px wide frame on a 440-wide canvas, at 3× → 1320 × 2868.
  iphone: {
    prefix: 'iphone-69',
    screen: { width: 400, height: 840, scale: 2.75, mobile: true }, // → 1100 × 2310
    canvas: { width: 440, height: 956, scale: 3 },
    css: `
.cap{left:34px;right:34px;top:58px;height:150px}
.cap p{font-size:44px}
.brand{left:36px;top:30px;font-size:15px}
.frame{left:32px;width:366px;top:232px;bottom:-40px;border-width:5px;border-radius:46px;padding-top:18px}`,
  },
  // 872 CSS px wide frame on a 1032-wide canvas, at 2× → 2064 × 2752.
  ipad: {
    prefix: 'ipad-13',
    screen: { width: 744, height: 1000, scale: 2.32, mobile: true }, // iPad mini width → 1726 × 2320
    canvas: { width: 1032, height: 1376, scale: 2 },
    css: `
.cap{left:80px;right:80px;top:100px;height:190px}
.cap p{font-size:76px}
.brand{left:82px;top:56px;font-size:24px}
.frame{left:80px;width:872px;top:330px;bottom:-60px;border-width:8px;border-radius:52px;padding-top:26px}`,
  },
  // 589 CSS px wide frame on a 669-wide canvas, at 3× → 2007 × 2853, the
  // iPhone Duo open. Captured at its own open width.
  duo: {
    prefix: 'duo',
    screen: { width: 669, height: 900, scale: 2.64, mobile: true }, // → 1766 × 2376
    canvas: { width: 669, height: 951, scale: 3 },
    css: `
.cap{left:48px;right:48px;top:74px;height:170px}
.cap p{font-size:56px}
.brand{left:50px;top:40px;font-size:18px}
.frame{left:40px;width:589px;top:276px;bottom:-50px;border-width:6px;border-radius:48px;padding-top:22px}`,
  },
} as const;

const DEVICE = DEVICES[(process.env.DEVICE ?? 'iphone') as keyof typeof DEVICES];
if (!DEVICE) throw new Error(`DEVICE must be one of: ${Object.keys(DEVICES).join(', ')}`);
const SCREEN = DEVICE.screen;

function isGoodDay(verdict: string): boolean {
  return !/write-off|indoors|stay in|not a|no /i.test(verdict);
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

async function verdict(page: Page): Promise<string> {
  await page.locator('h1.call-verdict').first().waitFor({ timeout: 90_000 });
  return (await page.locator('h1.call-verdict').first().innerText()).replace(/\s*Why\?\s*$/, '').trim();
}

async function dateLine(page: Page): Promise<string> {
  return page.locator('button[aria-label$="change location"]').first().innerText();
}

async function nextDay(page: Page) {
  const before = await dateLine(page);
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      if ((await dateLine(page)) !== before) return;
    }
  }
  throw new Error(`Could not move past "${before}"`);
}

/** Scroll so a drawn section sits just under the app's top bar. */
async function toSection(page: Page, id: string) {
  await page.locator(`#${id}.gd-drawn-sec`).waitFor({ timeout: 90_000 });
  await page.evaluate((id) => {
    const el = document.getElementById(id)!;
    window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 14));
  }, id);
  await settle(page);
}

async function openDrawn(page: Page, spot: (typeof SPOTS)[keyof typeof SPOTS], id: string) {
  const q = new URLSearchParams({ n: spot.n, lat: String(spot.lat), lon: String(spot.lon), day: '0' });
  if (spot.c) q.set('c', '1');
  await page.goto(`${BASE_URL}/weather?${q}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await toSection(page, id);
}

function composeHtml(caption: string, screen: Buffer): string {
  const font = (f: string) => readFileSync(path.join('public', 'fonts', 'daisy-serif', f)).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=block">
<style>
@font-face{font-family:'Daisy Serif';src:url(data:font/woff2;base64,${font('DaisySerif-Bold.woff2')}) format('woff2');font-weight:700}
html,body{margin:0;width:${DEVICE.canvas.width}px;height:${DEVICE.canvas.height}px;overflow:hidden;background:#faf8f5}
.cap{position:absolute;display:flex;align-items:center}
.cap p{margin:0;font-family:'Caveat',cursive;font-weight:700;line-height:1.02;color:#2b2824;text-wrap:balance}
.brand{position:absolute;font-family:'Daisy Serif',Georgia,serif;font-weight:700;letter-spacing:.02em;color:#3d6b4f}
.frame{position:absolute;border-style:solid;border-color:#2b2824;overflow:hidden;background:#faf8f5;box-sizing:border-box}
.frame img{width:100%;display:block}
${DEVICE.css}
</style></head><body>
<div class="brand">Go Daisy</div>
<div class="cap"><p>${caption}</p></div>
<div class="frame"><img src="data:image/png;base64,${screen.toString('base64')}"></div>
</body></html>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (f.startsWith(`${DEVICE.prefix}-`) && f.endsWith('.png')) rmSync(path.join(OUT_DIR, f));

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({
    viewport: { width: SCREEN.width, height: SCREEN.height },
    deviceScaleFactor: SCREEN.scale,
    isMobile: SCREEN.mobile,
    hasTouch: true,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const host = new URL(BASE_URL).hostname;
  await context.addCookies([{
    name: 'godaisy.call.setup',
    value: encodeURIComponent(Buffer.from(JSON.stringify(SETUP), 'utf8').toString('base64')),
    domain: host, path: '/', secure: BASE_URL.startsWith('https'), sameSite: 'Lax',
  }]);
  const page = await context.newPage();

  const composer = await browser.newPage({
    viewport: { width: DEVICE.canvas.width, height: DEVICE.canvas.height },
    deviceScaleFactor: DEVICE.canvas.scale,
  });
  let n = 0;
  const shot = async (caption: string) => {
    const screen = await page.screenshot();
    await composer.setContent(composeHtml(caption, screen), { waitUntil: 'networkidle' });
    await composer.evaluate(async () => { await document.fonts.load("700 44px 'Caveat'"); await document.fonts.ready; });
    n += 1;
    const file = path.join(OUT_DIR, `${DEVICE.prefix}-${String(n).padStart(2, '0')}.png`);
    await composer.screenshot({ path: file });
    console.log(`${file}  ${caption}`);
  };

  // 1. The call, on the best day this week.
  await page.goto(`${BASE_URL}/call`, { waitUntil: 'networkidle', timeout: 90_000 });
  await settle(page);
  const week: string[] = [];
  for (let d = 0; d < 7; d++) {
    week.push(await verdict(page));
    if (d < 6) await nextDay(page);
  }
  console.log('This week:', week.map((v, i) => `${i}: ${v}`).join(' | '));
  const best = Math.max(0, week.findIndex(isGoodDay));
  await page.goto(`${BASE_URL}/call`, { waitUntil: 'networkidle' });
  await verdict(page);
  await settle(page);
  for (let d = 0; d < best; d++) await nextDay(page);
  await settle(page);
  await shot('One sentence a day, about what you actually do.');

  // 2. "Why?" opens the drawn page for that day.
  await page.locator('button.call-why').first().click();
  await page.waitForURL(/\/weather/, { timeout: 60_000 });
  await page.locator('.gd-drawn-sec').first().waitFor({ timeout: 90_000 });
  await settle(page);
  await shot('Ask why, and it draws you the answer.');

  // 3–6. A drawing for each kind of weather. The App Store shows the first
  // two or three side by side, so the drawing after "Why?" matches the call:
  // the sea straight after a surf day, the land after anything else.
  const sea = async () => {
    await openDrawn(page, SPOTS.gijon, 'sea');
    await shot('The waves against a person, and the wetsuit to wear.');
  };
  const surfDay = /surf|wave/i.test(week[best]);
  if (surfDay) await sea();
  await openDrawn(page, SPOTS.edale, 'wind');
  await shot('The wind, flag by flag, hour by hour.');
  await openDrawn(page, SPOTS.hackney, 'ground');
  await shot('Firm, soft or muddy, in footwear.');
  await openDrawn(page, SPOTS.edinburgh, 'rain');
  await shot('A week of rain, one umbrella a day.');
  if (!surfDay) await sea();

  // 7. Onboarding.
  await page.goto(`${BASE_URL}/start`, { waitUntil: 'networkidle' });
  await settle(page);
  await shot('Pick what you do. Three is plenty to start.');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
