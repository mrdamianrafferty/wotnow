/**
 * Rendering the four shares.
 *
 * `next/og` is already bundled in Next 16 — satori compiled in, nothing to
 * install. It runs on the NODE runtime, not edge: sharp is unavailable on edge,
 * and Fluid Compute removes the reason to prefer it.
 *
 * @module lib/godaisy/share/render
 */

import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { shareTemplate, CROP_SIZE, type ShareCrop, type ShareData } from './template';

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');

/**
 * Both halves of the type system, as buffers.
 *
 * The app's serif is Daisy Serif and its body type is the system stack — which
 * does not exist on a server. Satori takes buffers, not family names, so the
 * sans ships as a file too.
 */
let fonts: Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' | 'italic' }> | null = null;

function loadFonts() {
  if (fonts) return fonts;
  const read = (p: string) => fs.readFileSync(path.join(FONT_DIR, p));
  fonts = [
    { name: 'DaisySerif', data: read('daisy-serif/DaisySerif-Bold.ttf'), weight: 700, style: 'normal' },
    { name: 'DaisySerif', data: read('daisy-serif/DaisySerif-Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'DaisySerifItalic', data: read('daisy-serif/DaisySerif-Italic.ttf'), weight: 400, style: 'italic' },
    { name: 'Inter', data: read('inter/Inter-Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Inter', data: read('inter/Inter-Bold.ttf'), weight: 700, style: 'normal' },
  ];
  return fonts;
}

export async function renderShare(data: ShareData, crop: ShareCrop): Promise<ImageResponse> {
  const { width, height } = CROP_SIZE[crop];
  return new ImageResponse(shareTemplate(data, crop) as never, {
    width,
    height,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fonts: loadFonts() as any,
  });
}
