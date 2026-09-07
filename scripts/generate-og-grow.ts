/**
 * Grow Daisy's Open Graph card — `public/og-grow.png`.
 *
 * `pages/grow/index.tsx` has pointed `og:image` and `twitter:image` at
 * `https://grow.godaisy.io/og-grow.png` since it was written, and the file did
 * not exist. Every share of the Grow homepage — WhatsApp, Slack, LinkedIn,
 * iMessage — rendered as a bare grey link.
 *
 * It is the same defect Go Daisy had, on the sibling, in the same repository,
 * found by checking the family after fixing the first one. Grow is also the app
 * actually earning search impressions, which makes it the one where a share is
 * most likely to happen.
 *
 * SIX PLANTS, NOT ONE PHOTOGRAPH. Go Daisy's card is a single illustration
 * because Go Daisy answers one question about one day. Grow is a database of
 * 450 species and a calendar, and a tile grid says that where one hero plant
 * would just say "tomatoes". It also fits the source art: the species images
 * are 514×514 squares, which crop badly into a tall strip and perfectly into a
 * 2×3 grid of 200×210 tiles.
 *
 * Run: `npx tsx scripts/generate-og-grow.ts`
 * Re-run when the wordmark, the tagline or the tile selection change.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';

const ROOT = process.cwd();
const FONT_DIR = path.join(ROOT, 'public', 'fonts');
const PLANTS = path.join(ROOT, 'public', 'grow', 'plants', 'lg');
const OUT = path.join(ROOT, 'public', 'og-grow.png');

/*
 * Grow's palette is emerald where Go Daisy's is moss — 41 uses of emerald-600
 * across `components/grow/`, against Go Daisy's `--call-moss`. Two apps, two
 * greens, deliberately: a shared card would make them look like one product.
 * The paper and ink are shared, because the type is.
 */
const EMERALD = '#047857'; // emerald-700
const EMERALD_DEEP = '#065f46'; // emerald-800
const INK = '#1c1917';
const PAPER = '#faf8f5';
const BODY = '#44403c';
const HAIR = '#e8dfd3';
const INK3 = '#57534e';

const read = (p: string) => fs.readFileSync(path.join(FONT_DIR, p));

const row = (style: Record<string, unknown>, children: unknown) =>
  ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

/** Six species, chosen to read as "a garden" rather than as one crop. */
const TILES = [
  'tomato-slicer-solanum-lycopersicum.webp',
  'lavender-lavandula-angustifolia.webp',
  'runner-bean-phaseolus-coccineus.webp',
  'garlic-allium-sativum.webp',
  'courgette-zucchini-cucurbita-pepo.webp',
  'rosemary-salvia-rosmarinus.webp',
];

/**
 * The tiles as JPEG data URIs at their final size.
 *
 * Resized here rather than by satori: satori scales what it is given, so
 * handing it six 514×514 originals to draw at 200×210 wastes most of the
 * bytes and softens the result. WebP in, JPEG out — satori does not decode
 * WebP.
 */
async function tiles(): Promise<string[]> {
  return Promise.all(
    TILES.map(async (name) => {
      const buf = await sharp(path.join(PLANTS, name))
        .resize(200, 210, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 82 })
        .toBuffer();
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }),
  );
}

async function main() {
  const W = 688; // 1200 − 400 tiles − 56 padding each side
  const imgs = await tiles();

  const template = row({ width: 1200, height: 630, background: PAPER }, [
    // The grid. A wrapping flex row rather than CSS grid: satori has no grid.
    row({ width: 400, height: 630, flexWrap: 'wrap', background: EMERALD_DEEP }, [
      ...imgs.map((src) => ({
        type: 'img',
        props: { src, width: 200, height: 210 },
      })),
    ]),
    row(
      {
        flexDirection: 'column',
        width: W,
        margin: '0 56px',
        paddingTop: 56,
        paddingBottom: 48,
        justifyContent: 'space-between',
      },
      [
        row({ flexDirection: 'column', gap: 18, width: W }, [
          row(
            {
              fontFamily: 'DaisySerifItalic',
              fontStyle: 'italic',
              fontSize: 22,
              letterSpacing: '0.09em',
              color: EMERALD,
            },
            'GROW DAISY',
          ),
          row(
            {
              fontFamily: 'DaisySerif',
              fontWeight: 700,
              fontSize: 68,
              lineHeight: 1.02,
              letterSpacing: '-0.015em',
              color: INK,
              width: W,
            },
            'What to plant, and when.',
          ),
          row(
            { fontFamily: 'Inter', fontSize: 25, lineHeight: 1.5, color: BODY, width: W },
            'RHS hardiness, your own frost dates, and the jobs this week’s weather actually asks for.',
          ),
        ]),
        row({ flexDirection: 'column', gap: 22, width: W }, [
          row({ height: 1, background: HAIR, width: W }, []),
          row({ justifyContent: 'space-between', width: W, alignItems: 'baseline' }, [
            row(
              { fontFamily: 'DaisySerif', fontWeight: 700, fontSize: 26, color: INK },
              'grow.godaisy.io',
            ),
            row({ fontFamily: 'Inter', fontSize: 22, color: INK3 }, '450 species. Free to start.'),
          ]),
        ]),
      ],
    ),
  ]);

  const image = new ImageResponse(template as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'DaisySerif', data: read('daisy-serif/DaisySerif-Bold.ttf'), weight: 700, style: 'normal' },
      { name: 'DaisySerif', data: read('daisy-serif/DaisySerif-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'DaisySerifItalic', data: read('daisy-serif/DaisySerif-Italic.ttf'), weight: 400, style: 'italic' },
      { name: 'Inter', data: read('inter/Inter-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Inter', data: read('inter/Inter-Bold.ttf'), weight: 700, style: 'normal' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
  });

  /*
   * Re-encoded rather than written straight out.
   *
   * `ImageResponse` emits an unoptimised PNG, and six photographic tiles make
   * that expensive — 575 KB against Go Daisy's 284 KB for a single flat
   * illustration. A social scraper fetches this on a timeout; a card that
   * arrives late is a card that does not appear. `palette: true` quantises to
   * 256 colours, which is invisible on garden greens and roughly halves it.
   */
  const raw = Buffer.from(await image.arrayBuffer());
  await sharp(raw).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(OUT);

  const { size } = fs.statSync(OUT);
  console.log(
    `Wrote ${path.relative(ROOT, OUT)} — 1200×630, ${(size / 1024).toFixed(0)} KB ` +
    `(from ${(raw.length / 1024).toFixed(0)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
