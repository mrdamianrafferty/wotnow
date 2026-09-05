/**
 * Bake the photo treatment for every activity, once, at build time.
 *
 * Satori applies CSS filters to text and cannot decode WebP, so the treatment
 * the app does in CSS has to happen before an image reaches the renderer. The
 * imagery decision makes this cheap: a fixed set of 117 activities rather than
 * an unknown number of places.
 *
 *   npx tsx scripts/prebake-call-images.ts
 *   npx tsx scripts/prebake-call-images.ts --crop=og      # the crawler's crop only
 *
 * Measured for the full set: 351 images, 18.6 MB, ~32 seconds. If that is too
 * much in the deployment, bake `og` alone — it is the crop crawlers fetch and the
 * one that must be fast — and let card and story bake on demand behind the CDN.
 */

import fs from 'node:fs';
import path from 'node:path';
import bgMap from '../data/bgMap';
import { bakedPath, BAKED_DIR, CROP_PHOTO } from '../lib/godaisy/share/photos';
import { bake } from '../lib/godaisy/share/bake';
import type { ShareCrop } from '../lib/godaisy/share/template';

const ARGS = process.argv.slice(2);
const ALL_CROPS = Object.keys(CROP_PHOTO) as ShareCrop[];
const only = (ARGS.find((a) => a.startsWith('--crop=')) || '').split('=')[1];
if (only && !(ALL_CROPS as string[]).includes(only)) {
  console.error(`--crop must be one of: ${ALL_CROPS.join(', ')} (got "${only}")`);
  process.exit(1);
}
const crops = only ? [only as ShareCrop] : ALL_CROPS;

async function main() {
  fs.mkdirSync(BAKED_DIR, { recursive: true });
  const ids = Object.keys(bgMap);
  let made = 0, skipped = 0, missing = 0, bytes = 0;
  const t0 = Date.now();

  for (const id of ids) {
    const src = path.join(process.cwd(), 'public', bgMap[id].replace(/^\//, ''));
    if (!fs.existsSync(src)) { missing++; continue; }
    for (const crop of crops) {
      const out = bakedPath(id, crop);
      if (fs.existsSync(out)) { skipped++; bytes += fs.statSync(out).size; continue; }
      const buf = await bake(src, crop);
      fs.writeFileSync(out, buf);
      made++; bytes += buf.length;
    }
  }

  console.log(`activities      ${ids.length}`);
  console.log(`crops           ${crops.join(', ')}`);
  console.log(`baked           ${made}`);
  console.log(`already present ${skipped}`);
  if (missing) console.log(`source missing  ${missing}`);
  console.log(`total on disk   ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`elapsed         ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
