/**
 * Capture Go Daisy store screenshots from the live site.
 *
 *   npx tsx scripts/capture-store-screenshots.ts
 *
 * Opens godaisy.io at a phone viewport (360×800 CSS px at 3×, so 1080×2400 —
 * the size Play Console already has) and writes PNGs to
 * `store-assets/godaisy/`. No login and no API keys: the setup cookie that
 * `/start` writes is set directly, so every screen shows a real forecast for a
 * real place instead of the default.
 *
 * The weather is whatever it is today. The script walks the week and puts the
 * best day first, but a run in a wet week is still a wet week — look at the
 * output before uploading it.
 *
 * Env overrides:
 *   BASE_URL       default https://godaisy.io
 *   OUT_DIR        default store-assets/godaisy
 *   CHROMIUM_PATH  a Chromium binary, if Playwright's own is not installed
 */

import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'https://godaisy.io';
const OUT_DIR = process.env.OUT_DIR ?? path.join('store-assets', 'godaisy');

/** Same shape as `CallSetup` in lib/godaisy/call/setup.ts. */
const SETUP = {
  v: 1,
  sports: ['hiking', 'surfing', 'road_cycling', 'picnicking', 'stargazing'],
  place: { name: 'Oviedo', lat: 43.3614, lon: -5.8494, country: 'Spain' },
  coastal: { name: 'Gijón', lat: 43.5453, lon: -5.6619, country: 'Spain' },
  hour: 7,
};

/** A verdict worth leading with: not a write-off, not a stay-in. */
function isGoodDay(verdict: string): boolean {
  return !/write-off|indoors|stay in|not a|no /i.test(verdict);
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

async function verdict(page: Page): Promise<string> {
  // The live site can take a while to render its first call on a cold start.
  await page.locator('h1.call-verdict').first().waitFor({ timeout: 60_000 });
  return (await page.locator('h1.call-verdict').first().innerText()).replace(/\s*Why\?\s*$/, '').trim();
}

/** The "Oviedo · Thursday 8 October" line; it changes when the day does. */
async function dateLine(page: Page): Promise<string> {
  return page.locator('button[aria-label$="change location"]').first().innerText();
}

/**
 * Step forward one day. The key handler only exists once the page has
 * hydrated, and a press before that is silently lost — which reads as the same
 * day seven times — so wait for the date to change, pressing again if not.
 */
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

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  // A shorter run must not leave last time's extra shots behind to be uploaded.
  for (const f of readdirSync(OUT_DIR)) {
    if (/^screenshot-real-\d+\.png$/.test(f)) rmSync(path.join(OUT_DIR, f));
  }
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
    reducedMotion: 'reduce',
  });
  const host = new URL(BASE_URL).hostname;
  await context.addCookies([{
    name: 'godaisy.call.setup',
    value: encodeURIComponent(Buffer.from(JSON.stringify(SETUP), 'utf8').toString('base64')),
    domain: host,
    path: '/',
    secure: BASE_URL.startsWith('https'),
    sameSite: 'Lax',
  }]);

  const page = await context.newPage();
  let n = 0;
  const shot = async (label: string) => {
    n += 1;
    const file = path.join(OUT_DIR, `screenshot-real-${n}.png`);
    await settle(page);
    await page.screenshot({ path: file });
    console.log(`${file}  ${label}`);
  };

  // The call, on the best day this week.
  await page.goto(`${BASE_URL}/call`, { waitUntil: 'networkidle' });
  await settle(page);
  const week: string[] = [];
  for (let d = 0; d < 7; d++) {
    week.push(await verdict(page));
    if (d < 6) {
      await nextDay(page);
    }
  }
  console.log('This week:', week.map((v, i) => `${i}: ${v}`).join(' | '));
  const best = Math.max(0, week.findIndex(isGoodDay));
  const today = 0;
  // A second good day, a couple of days on, so the set is not one sport twice.
  const second = week.findIndex((v, i) => i > best + 1 && isGoodDay(v));

  const goToDay = async (day: number) => {
    await page.goto(`${BASE_URL}/call`, { waitUntil: 'networkidle' });
    await verdict(page);
    await settle(page);
    for (let d = 0; d < day; d++) {
      await nextDay(page);
    }
  };

  await goToDay(best);
  await shot(`call, day ${best}: ${week[best]}`);

  await page.locator('button.call-why').first().click();
  await page.waitForTimeout(800);
  await shot('why — the evidence behind the call');

  if (second > 0) {
    await goToDay(second);
    await shot(`call, day ${second}: ${week[second]}`);
  }

  // If today is a bad day, show how the app handles it ("Instead").
  if (best !== today) {
    await goToDay(today);
    await shot(`call, today: ${week[today]}`);
  }

  await page.goto(`${BASE_URL}/start`, { waitUntil: 'networkidle' });
  await shot('onboarding — what do you actually do?');

  await page.goto(`${BASE_URL}/weather`, { waitUntil: 'networkidle' });
  await shot('conditions');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
