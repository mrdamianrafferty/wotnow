/**
 * Baking the photo treatment. **Build time only** — this imports sharp.
 *
 * Satori applies CSS filters to text and cannot decode WebP, so the treatment
 * the app does in CSS has to happen before an image reaches the renderer. The
 * imagery decision makes this cheap: a fixed set of 117 activities rather than
 * an unknown number of places.
 *
 * Kept apart from `photos.ts` because anything the share endpoint imports ends
 * up in its function bundle, and sharp's native binaries alone took that past
 * Vercel's 250 MB limit.
 *
 * @module lib/godaisy/share/bake
 */

import sharp from 'sharp';
import { CROP_PHOTO, TREATMENT } from './photos';
import type { ShareCrop } from './template';

/**
 * Treat one source image for one crop.
 *
 * `position: 'attention'` matters: a centre crop of a 16:9 landscape into a
 * 1080x1920 story throws the subject away.
 */
export async function bake(source: string, crop: ShareCrop): Promise<Buffer> {
  const { w, h, brightness } = CROP_PHOTO[crop];
  return sharp(source)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: TREATMENT.saturation, brightness })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}
