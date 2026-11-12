/**
 * Sharing one drawing as a card.
 *
 * The card is drawn on a canvas in the browser, which Jest does not have, so
 * what is tested here is everything that decides what the card says and
 * looks like: the colours it resolves the drawing to, how its sentence
 * wraps, and where its link points.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CARD_COLOURS, resolveVars, wrapText, shareLink } from '@/lib/godaisy/conditions/shareCard';

describe('the card colours', () => {
  /*
   * The card is always paper and pencil, so it uses the LIGHT values — the
   * ones on bare `:root` in the stylesheet, before any dark-mode block. If the
   * page's palette changes and this map does not, every card drifts from the
   * page it came from.
   */
  it('match the light palette in styles/godaisy-call.css', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'styles', 'godaisy-call.css'), 'utf8');
    const light = new Map<string, string>();
    for (const block of css.split(/@media[^{]*\{/)[0].match(/:root\s*\{[^}]*\}/g) ?? []) {
      for (const m of block.matchAll(/(--call-[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)) light.set(m[1], m[2].toLowerCase());
    }
    // The sketch tokens are declared after the first dark block, so read their own :root too.
    const sketch = css.slice(css.indexOf('--call-sk-ink'));
    for (const m of sketch.slice(0, sketch.indexOf('}')).matchAll(/(--call-sk-[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)) {
      light.set(m[1], m[2].toLowerCase());
    }
    for (const [name, hex] of Object.entries(CARD_COLOURS)) {
      expect([name, light.get(name)]).toEqual([name, hex]);
    }
  });

  it('resolves every variable, and never to transparent', () => {
    const svg = '<path fill="var(--call-sk-cold)" stroke="var(--call-sk-ink)"/><path fill="var(--made-up)"/>';
    expect(resolveVars(svg)).toBe('<path fill="#2b689c" stroke="#2b2824"/><path fill="#2b2824"/>');
  });
});

describe('the sentence on the card', () => {
  const measure = (s: string) => s.length * 10;
  it('wraps by words to the width', () => {
    expect(wrapText(measure, 'Between 1:09pm and 7pm the sea climbs 3.8 m', 200))
      .toEqual(['Between 1:09pm and', '7pm the sea climbs', '3.8 m']);
  });
  it('gives a word wider than the line a line of its own', () => {
    expect(wrapText(measure, 'a Donaudampfschifffahrt b', 100)).toEqual(['a', 'Donaudampfschifffahrt', 'b']);
  });
});

describe('the link on a card', () => {
  const base = { origin: 'https://godaisy.io', place: 'Newquay', lat: 50.41556, lon: -5.075, coastal: true, section: 'tide' };
  it('points at the same place, day and section', () => {
    expect(shareLink({ ...base, day: 2 })).toBe('https://godaisy.io/weather?n=Newquay&lat=50.4156&lon=-5.0750&c=1&day=2#tide');
  });
  it('leaves today implicit, and inland places without the sea flag', () => {
    expect(shareLink({ ...base, day: 0, coastal: false })).toBe('https://godaisy.io/weather?n=Newquay&lat=50.4156&lon=-5.0750#tide');
  });
  it('never carries the call that was being explained', () => {
    expect(shareLink({ ...base, day: 0 })).not.toMatch(/[?&](v|w)=/);
  });
});
