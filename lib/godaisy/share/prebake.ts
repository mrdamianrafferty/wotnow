/**
 * The photo treatment, baked.
 *
 * Satori applies CSS filters to TEXT and cannot decode WebP, so the treatment
 * that the app does in CSS has to happen before the image reaches the renderer.
 * The imagery decision makes this cheap: the set is a fixed 117 activities, not
 * an unknown number of places.
 *
 * Build-time is the right place for it — `scripts/prebake-call-images.ts` — but
 * this module also runs on demand so a missing crop degrades to slow rather than
 * broken.
 *
 * @module lib/godaisy/share/prebake
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { ShareCrop } from './template';

/** The app's treatment, as numbers sharp understands. */
export const TREATMENT = { saturation: 0.85, brightness: 0.62 } as const;

/** Per crop: the photo box, and how far down the image is pushed. */
export const CROP_PHOTO: Record<ShareCrop, { w: number; h: number; brightness: number }> = {
  card: { w: 1080, h: 700, brightness: 0.70 },
  story: { w: 1080, h: 1920, brightness: TREATMENT.brightness },
  og: { w: 400, h: 630, brightness: TREATMENT.brightness },
};

export const BAKED_DIR = path.join(process.cwd(), 'public', 'call-photos');

/** Where a baked crop lives, if it has been baked. */
export function bakedPath(activityId: string, crop: ShareCrop): string {
  return path.join(BAKED_DIR, `${activityId}-${crop}.jpg`);
}

/**
 * Treat one source image for one crop.
 *
 * `position: 'attention'` matters: a centre crop of a 16:9 landscape into a
 * 1080×1920 story throws the subject away.
 */
export async function bake(source: string, crop: ShareCrop): Promise<Buffer> {
  const { w, h, brightness } = CROP_PHOTO[crop];
  return sharp(source)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: TREATMENT.saturation, brightness })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

/**
 * A data URI for the renderer: the baked file if it exists, otherwise baked now.
 *
 * JPEG, never WebP — satori throws `u2 is not iterable` on a WebP buffer, which
 * names neither images nor formats and costs an afternoon.
 */
export async function photoDataUri(
  activityId: string,
  sourcePath: string,
  crop: ShareCrop,
): Promise<string> {
  const cached = bakedPath(activityId, crop);
  const buf = fs.existsSync(cached) ? fs.readFileSync(cached) : await bake(sourcePath, crop);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
