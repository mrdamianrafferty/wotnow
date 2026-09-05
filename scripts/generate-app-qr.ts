/**
 * The QR code, generated once and committed.
 *
 *   npx tsx scripts/generate-app-qr.ts
 *
 * It is the same code on every one of ~2,000 spot pages, so generating it per
 * request would be 2,000 identical computations, and shipping a QR library to
 * the browser would be a dependency in the critical path of the only organic
 * acquisition the product has. A committed SVG is 1–2 KB, inlines into the
 * page, needs no request, and cannot fail at runtime.
 *
 * `qrcode` is a devDependency for exactly this reason: it runs here and never
 * ships.
 *
 * The encoded URL is `/app`, not the App Store — see APP_LINK_PATH. Change the
 * destination there and no code already printed goes stale; change it here and
 * every one of them does.
 */

import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { APP_LINK_PATH } from '../lib/daisyFamily';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://godaisy.io';
const TARGET = `${ORIGIN}${APP_LINK_PATH}`;
const OUT = path.join(process.cwd(), 'public', 'godaisy-app-qr.svg');

async function main() {
  const svg = await QRCode.toString(TARGET, {
    type: 'svg',
    /*
     * Medium correction, not High. The code is printed small beside a footer
     * and read off a screen, where damage is not the failure mode — size is.
     * `M` keeps the module count down, which keeps the modules big enough to
     * scan at 96px.
     */
    errorCorrectionLevel: 'M',
    margin: 1,
    // `currentColor` so it inherits the ink of whatever it sits in, and stays
    // legible if the page is ever dark. A hard-coded black square on a dark
    // ground is invisible, and an unscannable QR looks like a design choice.
    color: { dark: '#1c1917', light: '#00000000' },
  });

  fs.writeFileSync(OUT, svg);
  const modules = (svg.match(/viewBox="0 0 (\d+)/) ?? [])[1];
  console.log(`encoded  ${TARGET}`);
  console.log(`modules  ${modules}×${modules}`);
  console.log(`written  ${path.relative(process.cwd(), OUT)}  (${(svg.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
