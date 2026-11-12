/**
 * Render Go Daisy's App Store header and search results assets: the four
 * drawn days, as looping videos, plus a still of each.
 *
 *   npx tsx scripts/capture-store-header.ts            # both
 *   npx tsx scripts/capture-store-header.ts header     # 21:9 product page header
 *   npx tsx scripts/capture-store-header.ts search     # 3:2 search results
 *
 * Apple's spec for the header placement (App Store Connect › Header and
 * Search Results; developer.apple.com/help/app-store-connect/reference/
 * app-information/creative-assets-specifications):
 *   - 21:9, 3840 × 1646, 30 or 60 fps, 5–30 s, .mov/.m4v/.mp4
 *   - loops continuously, muted by default
 *   - key artwork inside the art safe area: 1646 × 661 at (1097, 493)
 * and for search results:
 *   - 3:2, 1920 × 1280 up to 3840 × 2560 (this renders the maximum)
 *   - same frame rates and lengths; muted, and can't be unmuted
 *   - art safe area (at the maximum size): 2168 × 1030 at (836, 765)
 *
 * So the verdict and the drawing sit inside the safe area, and everything
 * outside it is weather: the ground running off both edges, swell, hills,
 * stars, rain. A crop on any device loses atmosphere, never the point.
 *
 * The drawings are the homepage's own (lib/godaisy/landing/drawnDays.ts), so
 * the store and the site cannot drift apart. Four days at seven seconds is
 * 28 s, and every day starts and ends on blank paper, so the loop has no seam.
 *
 * Frame by frame: every animation is paused and set to the frame's time
 * before each screenshot, so the motion is exact however slow the machine.
 *
 * Writes store-assets/godaisy/app-store-{header,search}.mp4, and a still of
 * the surf day as app-store-{header,search}.png for the image slots.
 *
 * Env overrides:
 *   OUT_DIR        default store-assets/godaisy
 *   CHROMIUM_PATH  a Chromium binary, if Playwright's own is not installed
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DRAWN_DAYS, VIEW, DAY_MS, type DrawnDay, type Mark } from '../lib/godaisy/landing/drawnDays';
import { rough, circle, rng, type Pt } from '../lib/godaisy/conditions/pencil';

const OUT_DIR = process.env.OUT_DIR ?? path.join('store-assets', 'godaisy');
const FPS = 30;
const FADE_S = 0.45;

// Each page is laid out at half size and captured at 2×.
const PLACEMENTS = {
  header: { w: 3840, h: 1646, safe: { x: 1097, y: 493, w: 1646, h: 661 } },
  search: { w: 3840, h: 2560, safe: { x: 836, y: 765, w: 2168, h: 1030 } },
} as const;
type Placement = keyof typeof PLACEMENTS;

let W = 0, H = 0, K = 1;
let SAFE = { x: 0, y: 0, w: 0, h: 0 };
function use(p: Placement) {
  const c = PLACEMENTS[p];
  W = c.w / 2; H = c.h / 2;
  SAFE = { x: c.safe.x / 2, y: c.safe.y / 2, w: c.safe.w / 2, h: c.safe.h / 2 };
  // Everything was sized for the header's safe area; the search one is bigger.
  K = Math.min(SAFE.w / 823, SAFE.h / 330.5);
}

// The light sketch palette, as on the conditions page (styles/godaisy-call.css).
const VARS = `
  --call-page:#faf8f5; --call-ink-1:#1c1917; --call-ink-3:#57534e; --call-ink-4:#736c67;
  --call-sk-ink:#2b2824; --call-sk-pencil:#736c67; --call-sk-wash:#efe8dc; --call-sk-warm:#b4501a;
  --call-sk-water:#bcd6e6; --call-sk-water-ink:#2b689c; --call-sk-moss:#3d6b4f; --call-sk-amber:#8a6408;
  --call-sk-sun:#f1c84b; --call-sk-mud:#8a6a48; --call-sk-neoprene:#2f3b42;`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function markSvg(m: Mark, animate = true): string {
  const delay = animate ? ` style="animation-delay:${m.at.toFixed(2)}s` : '';
  if (m.kind === 'group') return `<g class="${animate ? 'pop' : ''}"${delay ? `${delay}"` : ''}>${m.marks.map((c) => markSvg(c, false)).join('')}</g>`;
  if (m.kind === 'text') {
    return `<text x="${m.x}" y="${m.y}" font-size="${m.size}" fill="${m.fill}" text-anchor="${m.anchor}" font-weight="${m.weight}" class="${animate ? 'fade' : ''}"${delay ? `${delay}"` : ''}>${esc(m.text)}</text>`;
  }
  const cls = !animate ? '' : m.arrive === 'draw' ? 'draw' : m.arrive === 'wash' ? 'wash' : 'fade';
  const st = !animate ? '' : `${delay};--len:${m.len};${m.arrive === 'draw' ? `animation-duration:${m.dur}s;` : ''}"`;
  return `<path d="${m.d}" fill="${m.fill}"${m.fillOpacity != null ? ` fill-opacity="${m.fillOpacity}"` : ''} stroke="${m.stroke}" stroke-width="${m.width}"${m.dash ? ` stroke-dasharray="${m.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round" class="${cls}"${st}/>`;
}

/** Weather in the margins, outside the safe area: it may be cropped, and that is fine. */
function atmosphere(day: DrawnDay['id'], groundY: number): string {
  const r = rng(day.length * 977);
  const out: string[] = [];
  let seed = 4000;
  const line = (pts: readonly Pt[], stroke: string, width: number, at: number, amp = 1.2, closed = false, fill = 'none') =>
    out.push(`<path d="${rough(pts, seed++, amp, closed)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" class="${fill === 'none' ? 'draw' : 'fade'}" style="animation-delay:${at.toFixed(2)}s;--len:2400;animation-duration:1.2s"/>`);
  const inMargin = (x: number, y: number) => x < SAFE.x - 20 || x > SAFE.x + SAFE.w + 20 || y < SAFE.y - 20 || y > SAFE.y + SAFE.h + 20;
  const spots = (n: number, yMin: number, yMax: number) => {
    const s: Pt[] = [];
    while (s.length < n) { const x = 30 + r() * (W - 60), y = yMin + r() * (yMax - yMin); if (inMargin(x, y)) s.push([x, y]); }
    return s;
  };
  // The ground, edge to edge.
  line([[-10, groundY], [W + 10, groundY]], 'var(--call-sk-pencil)', 1.8, 0, 1.4);

  if (day === 'surf') {
    for (const [x, y] of spots(16, 120, groundY - 40)) {
      const pts: Pt[] = [[x, y + 6], [x + 14, y - 4], [x + 28, y + 2], [x + 36, y + 8]];
      line(pts, 'var(--call-sk-water-ink)', 1.6, 0.6 + r() * 2.5, 0.5);
    }
    for (const [x, y] of spots(5, 60, 200)) line([[x - 12, y], [x - 4, y - 6], [x, y], [x + 4, y - 6], [x + 12, y]], 'var(--call-sk-pencil)', 1.4, 1 + r() * 2, 0.4);
  } else if (day === 'bike') {
    // hills either side, stopping short of the safe area
    const l = SAFE.x - 50, rgt = SAFE.x + SAFE.w + 40;
    line([[-10, groundY - 40], [l * 0.6, groundY - 110], [l, groundY - 74]], 'var(--call-sk-pencil)', 1.1, 0.3);
    line([[rgt, groundY - 70], [rgt + (W - rgt) * 0.3, groundY - 140], [rgt + (W - rgt) * 0.68, groundY - 90], [W + 10, groundY - 120]], 'var(--call-sk-pencil)', 1.1, 0.3);
    for (const [x] of spots(6, groundY - 2, groundY - 1)) {
      line([[x, groundY], [x, groundY - 42]], 'var(--call-sk-ink)', 1.6, 1.5 + r(), 0.6);
      line([[x, groundY - 42], [x + 16, groundY - 37], [x, groundY - 32]], 'var(--call-sk-ink)', 1.2, 1.7 + r(), 0.4, true, 'var(--call-sk-moss)');
    }
  } else if (day === 'football') {
    for (const [x, y] of spots(18, 40, groundY - 120)) {
      line([[x - 6, y], [x + 6, y]], 'var(--call-sk-amber)', 1.4, 1 + r() * 2.5, 0.3);
      line([[x, y - 6], [x, y + 6]], 'var(--call-sk-amber)', 1.4, 1 + r() * 2.5, 0.3);
    }
    line(circle(180, 120, 26, 18), 'var(--call-sk-ink)', 1.6, 0.8, 0.6, true, 'var(--call-sk-wash)');
  } else {
    for (const [x, y] of spots(110, 30, groundY - 8)) {
      out.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} l-5 14" stroke="var(--call-sk-water-ink)" stroke-width="1.5" stroke-linecap="round" class="draw" style="animation-delay:${(0.4 + r() * 2.4).toFixed(2)}s;--len:20;animation-duration:.2s"/>`);
    }
  }
  return out.join('');
}

function dayHtml(day: DrawnDay): string {
  // Text and drawing share the safe area: text on the left, drawing on the right.
  // Inset from the safe area's edges, so a tight crop never shaves a letter.
  const inset = 44 * K, textW = 270 * K, gap = 14 * K;
  const svgW = SAFE.w - inset * 2 - textW - gap, scale = svgW / VIEW.w, svgH = VIEW.h * scale;
  const svgX = SAFE.x + inset + textW + gap, svgY = SAFE.y + (SAFE.h - svgH) / 2;
  const groundY = svgY + 320 * scale;
  return `
  <svg class="bg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${atmosphere(day.id, groundY)}</svg>
  <div class="text" style="left:${SAFE.x + inset}px;top:${SAFE.y + 22 * K}px;width:${textW}px;height:${SAFE.h - 44 * K}px">
    <p class="kicker">${esc(day.kicker)}</p>
    <p class="lead">${esc(day.lead)}</p>
    <p class="verdict">${esc(day.verdict)}</p>
    <p class="hand write" style="animation-delay:${day.handAt}s">${esc(day.hand)}</p>
  </div>
  <svg class="art" viewBox="0 0 ${VIEW.w} ${VIEW.h}" style="left:${svgX}px;top:${svgY}px;width:${svgW}px;height:${svgH}px">${day.marks().map((m) => markSvg(m)).join('')}</svg>`;
}

function pageHtml(): string {
  const font = (f: string) => readFileSync(path.join('public', 'fonts', 'daisy-serif', f)).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=block">
<style>
@font-face{font-family:'Daisy Serif';src:url(data:font/woff2;base64,${font('DaisySerif-Regular.woff2')}) format('woff2');font-weight:400}
@font-face{font-family:'Daisy Serif';src:url(data:font/woff2;base64,${font('DaisySerif-Bold.woff2')}) format('woff2');font-weight:700}
@font-face{font-family:'Daisy Serif';src:url(data:font/woff2;base64,${font('DaisySerif-Italic.woff2')}) format('woff2');font-weight:400;font-style:italic}
:root{${VARS} --k:${K}}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:var(--call-page)}
#stage{position:relative;width:${W}px;height:${H}px}
.bg{position:absolute;inset:0}
.art{position:absolute;overflow:visible}
.art text{font-family:'Caveat',cursive}
.text{position:absolute;display:flex;flex-direction:column;justify-content:center}
.text p{margin:0}
.kicker{font:italic 400 calc(12px*var(--k)) 'Daisy Serif',Georgia,serif;letter-spacing:.13em;text-transform:uppercase;color:var(--call-ink-4);margin-bottom:calc(8px*var(--k))!important}
.lead{font:400 calc(19px*var(--k)) 'Daisy Serif',Georgia,serif;color:var(--call-ink-3)}
.verdict{font:700 calc(42px*var(--k))/1 'Daisy Serif',Georgia,serif;letter-spacing:-.02em;color:var(--call-ink-1);margin:calc(4px*var(--k)) 0 calc(10px*var(--k))!important;text-wrap:balance}
.hand{font:700 calc(21px*var(--k))/1.15 'Caveat',cursive;color:var(--call-sk-ink)}
.draw{stroke-dasharray:var(--len,1400);stroke-dashoffset:var(--len,1400);animation:draw .8s ease-out forwards}
.wash,.fade{opacity:0;animation:in .5s ease-out forwards}
.pop{opacity:0;transform-box:fill-box;transform-origin:50% 100%;transform:scale(.4);animation:pop .35s cubic-bezier(.3,1.6,.6,1) forwards}
.write{clip-path:inset(0 100% 0 0);animation:write .9s steps(18) forwards}
@keyframes draw{to{stroke-dashoffset:0}} @keyframes in{to{opacity:1}}
@keyframes pop{to{opacity:1;transform:scale(1)}} @keyframes write{to{clip-path:inset(0 0 0 0)}}
</style></head><body><div id="stage"></div></body></html>`;
}

async function render(placement: Placement) {
  use(placement);
  const frames = mkdtempSync(path.join(tmpdir(), `gd-${placement}-`));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(pageHtml(), { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.load("700 20px 'Caveat'");
    await document.fonts.load("700 20px 'Daisy Serif'");
    await document.fonts.ready;
  });

  const perDay = Math.round((DAY_MS / 1000) * FPS);
  const fadeFrames = Math.round(FADE_S * FPS);
  let n = 0;
  for (const day of DRAWN_DAYS) {
    await page.evaluate((html) => {
      const s = document.getElementById('stage')!;
      s.innerHTML = html;
      s.style.opacity = '1';
      document.getAnimations().forEach((a) => a.pause());
    }, dayHtml(day));
    for (let f = 0; f < perDay; f++) {
      const ms = (f / FPS) * 1000;
      const left = perDay - f;
      const opacity = left <= fadeFrames ? (left - 1) / fadeFrames : 1;
      await page.evaluate(({ ms, opacity }) => {
        document.getAnimations().forEach((a) => { a.currentTime = ms; });
        document.getElementById('stage')!.style.opacity = String(opacity);
      }, { ms, opacity });
      await page.screenshot({ path: path.join(frames, `${String(n).padStart(5, '0')}.png`) });
      if (day.id === 'surf' && f === Math.round(5.5 * FPS)) {
        await page.screenshot({ path: path.join(OUT_DIR, `app-store-${placement}.png`) });
      }
      n += 1;
    }
    console.log(`${day.name}: ${perDay} frames`);
  }
  await browser.close();

  const out = path.join(OUT_DIR, `app-store-${placement}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', path.join(frames, '%05d.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-shortest',
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '5.1', '-pix_fmt', 'yuv420p',
    '-crf', '16', '-maxrate', '40M', '-bufsize', '80M', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '256k', '-ac', '2',
    '-movflags', '+faststart',
    out,
  ], { stdio: 'inherit' });
  rmSync(frames, { recursive: true, force: true });
  console.log(`${n} frames, ${(n / FPS).toFixed(1)} s → ${out}`);
}

async function main() {
  const arg = process.argv[2] as Placement | undefined;
  if (arg && !(arg in PLACEMENTS)) throw new Error(`Unknown placement "${arg}": use header or search`);
  for (const p of arg ? [arg] : (Object.keys(PLACEMENTS) as Placement[])) await render(p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
