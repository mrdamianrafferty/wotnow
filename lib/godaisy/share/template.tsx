/**
 * One template, four renders.
 *
 * The share is the growth model: every session should produce an object a
 * non-user sees. The four renders come from ONE template at different crops, so
 * the link preview and the sent card can never disagree.
 *
 * Four things satori does that cost a day each, all found by building it:
 *
 *   1. **It cannot decode WebP.** A WebP data URI throws `u2 is not iterable`,
 *      which mentions neither images nor formats. Every activity image in the
 *      repo is WebP-first, so this is the first wall. Photographs must arrive
 *      here as JPEG or PNG — see `prebake.ts`.
 *   2. **CSS filters are applied — to your text.** Satori does not ignore
 *      `filter`. Put the photo treatment on a container and it multiplies the
 *      TYPE colour: warm white renders a dead grey, the photograph is untouched,
 *      nothing errors. The treatment is therefore baked into the image.
 *   3. **Text overflows unless its box has a literal pixel width.** `flexGrow`
 *      is not enough; a text node in a grown box runs past its own padding and
 *      clips at the image edge, which looks exactly like a bad margin.
 *   4. **The system font stack does not exist on a server.** Satori needs
 *      buffers, so both halves of the type system ship as files.
 *
 * @module lib/godaisy/share/template
 */

import type { CallFact } from '@/lib/godaisy/call/facts';

export type ShareCrop = 'card' | 'story' | 'og';

export interface ShareData {
  place: string;
  /** Short date, e.g. "Sat 5 Sep". */
  date: string;
  /** The whole verdict as one sentence, lead-in included. */
  verdict: string;
  reason: string;
  facts: CallFact[];
  /** The short URL printed on the card. */
  url: string;
  /** Pre-baked JPEG data URI. Never WebP — see the note above. */
  photo: string;
}

export const CROP_SIZE: Record<ShareCrop, { width: number; height: number }> = {
  card: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};

const INK = '#1c1917';
const PAPER = '#faf8f5';
const BODY = '#44403c';
const HAIR = '#e8dfd3';
const INK3 = '#57534e';

/** Satori needs every div to declare display; these helpers keep that honest. */
const row = (style: Record<string, unknown>, children: unknown) =>
  ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

const label = (text: string, color: string, size: number) =>
  row({ fontFamily: 'DaisySerifItalic', fontStyle: 'italic', fontSize: size, letterSpacing: '0.09em', color }, text);

/** Data values are SANS and tabular — never the display serif, however handsome. */
const value = (text: string, color: string, size: number) =>
  row({ fontFamily: 'Inter', fontWeight: 700, fontSize: size, color, fontVariantNumeric: 'tabular-nums' }, text);

const factRow = (facts: CallFact[], labelColor: string, valueColor: string, ls: number, vs: number, gap: number, width: number) =>
  row({ justifyContent: 'space-between', width, gap },
    facts.map((f) => row({ flexDirection: 'column', gap: 10 }, [label(f.label.toUpperCase(), labelColor, ls), value(f.value, valueColor, vs)])));

const footer = (d: ShareData, width: number, brand: string, urlColor: string, line: string, s1: number, s2: number) =>
  row({ flexDirection: 'column', gap: 22, width }, [
    row({ height: 1, background: line, width }, []),
    row({ justifyContent: 'space-between', width }, [
      row({ fontFamily: 'DaisySerif', fontWeight: 700, fontSize: s1, color: brand }, 'Go Daisy'),
      row({ fontFamily: 'Inter', fontSize: s2, color: urlColor }, d.url),
    ]),
  ]);

/**
 * The kicker is set SOLID, not at 75% opacity as it is in the app.
 *
 * Since the photograph identifies the sport rather than the spot, the kicker is
 * the only thing on the card naming where you are — and it has to survive a
 * thumbnail in a group chat.
 */
const kicker = (d: ShareData, color: string, size: number) =>
  label(`${d.place.toUpperCase()} · ${d.date.toUpperCase()}`, color, size);

export function shareTemplate(d: ShareData, crop: ShareCrop): unknown {
  if (crop === 'og') {
    const W = 688; // 1200 − 400 photo − 56 padding each side
    return row({ width: 1200, height: 630, background: PAPER }, [
      { type: 'img', props: { src: d.photo, width: 400, height: 630 } },
      row({ flexDirection: 'column', width: W, margin: '0 56px', paddingTop: 52, paddingBottom: 44, justifyContent: 'space-between' }, [
        row({ flexDirection: 'column', gap: 16, width: W }, [
          kicker(d, INK3, 22),
          row({ fontFamily: 'DaisySerif', fontWeight: 700, fontSize: 68, lineHeight: 1.02, letterSpacing: '-0.015em', color: INK, width: W }, d.verdict),
          row({ fontFamily: 'Inter', fontSize: 25, lineHeight: 1.5, color: BODY, width: W }, d.reason),
        ]),
        row({ flexDirection: 'column', gap: 22, width: W }, [
          factRow(d.facts, INK3, INK, 20, 31, 56, W),
          footer(d, W, INK, INK3, HAIR, 26, 22),
        ]),
      ]),
    ]);
  }

  if (crop === 'story') {
    const W = 928;
    return row({ width: 1080, height: 1920 }, [
      { type: 'img', props: { src: d.photo, width: 1080, height: 1920, style: { position: 'absolute' } } },
      row({ position: 'absolute', width: 1080, height: 1920, backgroundImage:
        'linear-gradient(to bottom, rgba(28,25,23,0.55) 0%, rgba(28,25,23,0.15) 30%, rgba(28,25,23,0.86) 78%, rgba(28,25,23,0.96) 100%)' }, []),
      row({ position: 'absolute', flexDirection: 'column', left: 76, top: 690, width: W, gap: 26 }, [
        kicker(d, PAPER, 32),
        row({ fontFamily: 'DaisySerif', fontWeight: 700, fontSize: 118, lineHeight: 0.98, letterSpacing: '-0.02em', color: PAPER, width: W }, d.verdict),
        row({ fontFamily: 'Inter', fontSize: 38, lineHeight: 1.5, color: 'rgba(250,248,245,0.92)', width: W }, d.reason),
      ]),
      // 96px from the bottom sits inside WhatsApp's control strip; 210 clears it.
      row({ position: 'absolute', flexDirection: 'column', left: 76, bottom: 210, width: W, gap: 34 }, [
        factRow(d.facts, 'rgba(250,248,245,0.82)', PAPER, 28, 42, 24, W),
        footer(d, W, PAPER, 'rgba(250,248,245,0.82)', 'rgba(250,248,245,0.28)', 34, 28),
      ]),
    ]);
  }

  const W = 968;
  return row({ flexDirection: 'column', width: 1080, height: 1080, background: PAPER }, [
    row({ position: 'relative', width: 1080, height: 700 }, [
      { type: 'img', props: { src: d.photo, width: 1080, height: 700, style: { position: 'absolute' } } },
      row({ position: 'absolute', width: 1080, height: 700, backgroundImage:
        'linear-gradient(to bottom, rgba(28,25,23,0.10) 0%, rgba(28,25,23,0.85) 100%)' }, []),
      row({ position: 'absolute', flexDirection: 'column', bottom: 54, left: 56, width: W, gap: 16 }, [
        kicker(d, PAPER, 30),
        row({ fontFamily: 'DaisySerif', fontWeight: 700, fontSize: 96, lineHeight: 1.02, letterSpacing: '-0.01em', color: PAPER, width: W }, d.verdict),
      ]),
    ]),
    row({ flexDirection: 'column', width: W, margin: '0 56px', paddingTop: 40, gap: 36 }, [
      factRow(d.facts, INK3, INK, 28, 42, 24, W),
      footer(d, W, INK, INK3, HAIR, 34, 28),
    ]),
  ]);
}

/**
 * The fourth render. No layout, same data — for people who hate images.
 *
 * IT IS AN INVITATION, NOT A FORECAST. The first version stated the verdict and
 * stopped — "Today is a day for a walk. Newquay, dry, 19°." — which is a weather
 * report, and nobody forwards a weather report. What a person actually sends a
 * friend is an ask, and the whole growth bet is that this message gets sent.
 * The conditions stay because they are the argument; the question is what makes
 * it a message rather than a readout.
 *
 * "Join me?" rather than "Would you like to join me?" — the app's voice is
 * British and understated ("a write-off", "the wind gets up after that"), and
 * the long form reads like a calendar invite from work.
 *
 * NO URL. It used to promote `d.url` — the short host the card prints — into an
 * absolute link. `d.url` names a place; the sender composes the link, because
 * only the sender knows which one is short enough to send.
 */
export function shareText(d: ShareData): string {
  const where = d.place ? ` ${d.place}` : '';
  return `${d.verdict}${where ? `${where},` : ''} ${d.reason.toLowerCase()} Join me?`
    .replace(/\s+/g, ' ')
    .trim();
}
