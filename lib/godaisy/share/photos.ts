/**
 * Reading baked photography at request time.
 *
 * **This module must never import sharp.** The share endpoint bundles whatever
 * it imports, and sharp's native binaries pushed `api/call/share` to 361 MB
 * against Vercel's 250 MB function limit — the deployment failed on it. Baking
 * belongs at build time; the request path only reads.
 *
 * @module lib/godaisy/share/photos
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ShareCrop } from './template';

/** The app's treatment, as numbers sharp understands. Applied at build time. */
export const TREATMENT = { saturation: 0.85, brightness: 0.62 } as const;

/** Per crop: the photo box, and how far down the image is pushed. */
export const CROP_PHOTO: Record<ShareCrop, { w: number; h: number; brightness: number }> = {
  card: { w: 1080, h: 700, brightness: 0.70 },
  story: { w: 1080, h: 1920, brightness: TREATMENT.brightness },
  og: { w: 400, h: 630, brightness: TREATMENT.brightness },
};

export const BAKED_DIR = path.join(process.cwd(), 'public', 'call-photos');

export function bakedPath(activityId: string, crop: ShareCrop): string {
  return path.join(BAKED_DIR, `${activityId}-${crop}.jpg`);
}

/**
 * A data URI for the renderer, from the baked file.
 *
 * JPEG, never WebP — satori throws `u2 is not iterable` on a WebP buffer, which
 * names neither images nor formats and costs an afternoon.
 *
 * Returns null when the crop has not been baked. The caller withholds the render
 * rather than guessing, and `scripts/prebake-call-images.ts` is the fix.
 */
export function bakedDataUri(activityId: string, crop: ShareCrop): string | null {
  const p = bakedPath(activityId, crop);
  if (!fs.existsSync(p)) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
}
