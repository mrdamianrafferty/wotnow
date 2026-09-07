/**
 * The default Open Graph card — `public/og-image.png`.
 *
 * `components/SEO.tsx` has always fallen back to `${siteUrl}/og-image.png` when
 * a page passes no image of its own. That file did not exist. It returned 404,
 * and had done since the component was written, so every share of the homepage,
 * `/faq`, `/weather` and `/start` — WhatsApp, iMessage, Slack, LinkedIn,
 * Facebook — rendered as a bare grey link. The same component serves Grow Daisy
 * and Findr, so all three brands shipped the same hole.
 *
 * WHY A GENERATED FILE AND NOT A ROUTE. The spot pages point `og:image` at
 * `/api/call/share`, which renders today's real verdict, and that is the right
 * answer for a page about one place on one day. The homepage is not about a day.
 * A static card cannot carry a verdict without asserting one it has not
 * measured, which is the single thing the voice rules forbid — so this says what
 * is true whenever it is read, and says it in the same grammar as the live
 * cards: photo left, cream panel right, italic letterspaced kicker, the serif
 * doing the talking.
 *
 * Run: `npx tsx scripts/generate-og-image.ts`
 * Re-run when the wordmark, the tagline or the share template's palette change.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

const ROOT = process.cwd();
const FONT_DIR = path.join(ROOT, 'public', 'fonts');
const OUT = path.join(ROOT, 'public', 'og-image.png');

/* The share template's palette, not a second set of near-identical browns. */
const INK = '#1c1917';
const PAPER = '#faf8f5';
const BODY = '#44403c';
const HAIR = '#e8dfd3';
const INK3 = '#57534e';

const read = (p: string) => fs.readFileSync(path.join(FONT_DIR, p));

const row = (style: Record<string, unknown>, children: unknown) =>
  ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

/**
 * The illustration, from the set the live share cards draw on — already cropped
 * to the 400×630 strip this layout wants. Inlined as a data URI because satori
 * resolves no relative paths.
 *
 * NOT `default-og.jpg`. That is the pipeline's fallback for an activity with no
 * art of its own, and it is a dark room with a lamp on — the picture the app
 * shows you when the answer is stay in. As the card for the whole product it
 * argues the opposite of the product. Hiking is the one that reads as outdoors
 * in general rather than as one sport, which is what a homepage covering a
 * hundred activities needs.
 */
const PHOTO = 'hiking-og.jpg';

function photoDataUri(): string {
  const buf = fs.readFileSync(path.join(ROOT, 'public', 'call-photos', PHOTO));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function main() {
  const W = 688; // 1200 − 400 photo − 56 padding each side

  const template = row({ width: 1200, height: 630, background: PAPER }, [
    { type: 'img', props: { src: photoDataUri(), width: 400, height: 630 } },
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
              color: INK3,
            },
            'GO DAISY',
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
            'Weather you can act on.',
          ),
          row(
            { fontFamily: 'Inter', fontSize: 25, lineHeight: 1.5, color: BODY, width: W },
            'One message a day telling you what today is good for, for the things you actually do.',
          ),
        ]),
        row({ flexDirection: 'column', gap: 22, width: W }, [
          row({ height: 1, background: HAIR, width: W }, []),
          row({ justifyContent: 'space-between', width: W, alignItems: 'baseline' }, [
            row({ fontFamily: 'DaisySerif', fontWeight: 700, fontSize: 26, color: INK }, 'godaisy.io'),
            row({ fontFamily: 'Inter', fontSize: 22, color: INK3 }, 'Free. Ad-free.'),
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

  fs.writeFileSync(OUT, Buffer.from(await image.arrayBuffer()));
  const { size } = fs.statSync(OUT);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — 1200×630, ${(size / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
