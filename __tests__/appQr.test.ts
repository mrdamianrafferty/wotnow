/**
 * @jest-environment node
 *
 * Node, not jsdom: `qrcode` reaches for `TextEncoder`, which jsdom does not
 * provide. This file touches no DOM — it reads a file and compares matrices.
 */

/**
 * The QR code on the spot pages.
 *
 * A wrong QR looks exactly like a right one. Nothing about the page, the build
 * or a screenshot would show that the committed SVG had gone stale against
 * `APP_LINK_PATH`, and the failure lands on printed codes and screenshots that
 * are already out in the world — the one artefact here that cannot be
 * redeployed.
 *
 * So the SVG is checked against the encoder, module for module, on every run.
 */

import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { APP_LINK_PATH, APP_STORE_URL } from '@/lib/daisyFamily';

const SVG = path.join(process.cwd(), 'public', 'godaisy-app-qr.svg');
const ORIGIN = 'https://godaisy.io';
const MARGIN = 1;

/**
 * The modules a QR SVG actually draws.
 *
 * `qrcode` writes one path per code: `M x y.5` opens a row, `h n` draws a run,
 * and `m dx 0` moves the pen RELATIVELY. Reading `m` as absolute produces a
 * plausible-looking 56 modules out of 326 and a confident FAIL, which is how
 * the first version of this went.
 */
function modulesOf(svg: string): Set<string> {
  const d = / d="([^"]+)"/.exec(svg)?.[1] ?? '';
  const drawn = new Set<string>();
  let x = 0;
  let y = 0;
  for (const [, cmd, aRaw, bRaw] of d.matchAll(/([MmhH])\s*(-?[\d.]+)(?:[ ,](-?[\d.]+))?/g)) {
    const a = Number(aRaw);
    const b = Number(bRaw);
    if (cmd === 'M') { x = a; y = Math.floor(b); }
    else if (cmd === 'm') { x += a; y += Math.floor(b); }
    else {
      const run = cmd === 'h' ? a : a - x;
      for (let i = 0; i < run; i++) drawn.add(`${x - MARGIN + i},${y - MARGIN}`);
      x += run;
    }
  }
  return drawn;
}

describe('the app QR code', () => {
  const svg = fs.readFileSync(SVG, 'utf8');

  it('encodes the app link, module for module', () => {
    const qr = QRCode.create(`${ORIGIN}${APP_LINK_PATH}`, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const drawn = modulesOf(svg);

    const wrong: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isDark = Boolean(qr.modules.data[r * size + c]);
        if (isDark !== drawn.has(`${c},${r}`)) wrong.push(`${c},${r}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
   * It points at `/app`, never at the store. A QR outlives what it encodes —
   * printed, screenshotted, stuck in a window — so the destination has to be
   * something we can still change afterwards.
   */
  it('points at the redirect, not at the App Store', () => {
    expect(APP_LINK_PATH).toBe('/app');
    const store = QRCode.create(APP_STORE_URL, { errorCorrectionLevel: 'M' });
    const app = QRCode.create(`${ORIGIN}${APP_LINK_PATH}`, { errorCorrectionLevel: 'M' });
    expect(store.modules.size).not.toBe(app.modules.size);
    expect(modulesOf(svg).size).toBeGreaterThan(0);
  });

  /*
   * A transparent light colour is emitted as NO background at all rather than
   * as `#00000000` — asserting the literal was wrong about the library, not
   * about the file. What matters is that nothing paints a ground: a white
   * square behind the code would sit on the panel it is placed on and look
   * like a bug, and on a dark ground it would be the only thing visible.
   */
  it('paints no ground of its own, so it sits on whatever it is placed on', () => {
    expect(svg).not.toMatch(/<rect/);
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('stroke="#1c1917"');
  });
});
