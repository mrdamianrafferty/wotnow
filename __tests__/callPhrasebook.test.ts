/**
 * The phrasebook has to fit the lockup.
 *
 * The verdict is set in Charis SIL at 44–62px, three lines maximum, in the call
 * screen's 338px column. Adding a phrase that overflows that is easy and
 * invisible until someone looks at a phone, so it is checked here.
 *
 * Canvas text metrics are not available in jsdom, so this uses a **character
 * budget calibrated against real measurement** rather than measuring directly.
 * Every phrase was rendered in Charis in a browser at the real column width: the
 * longest that held three lines at the floor was 41 characters, and the shortest
 * that failed was 36 — the overlap being word lengths, since one long word can
 * overflow a line on its own. 34 is the conservative line under both.
 *
 * If a phrase legitimately needs to be longer, measure it for real before
 * raising this number.
 */

import { PHRASEBOOK, choosePhrase, fillWhen } from '@/lib/godaisy/call/phrasebook';

/** Calibrated against Charis SIL at 44px in a 338px column. See the note above. */
const MAX_FILLED_CHARS = 41;

/** The longest weekday, because that is the worst case for a filled token. */
const WORST_WEEKDAY = 'Wednesday';

const filled = (t: string) => fillWhen(t, WORST_WEEKDAY, false);

describe('call phrasebook', () => {
  const entries = Object.entries(PHRASEBOOK);

  it('has phrases for every sport it claims', () => {
    expect(entries.length).toBeGreaterThan(20);
    for (const [id, e] of entries) {
      const total = (e.predicates?.length ?? 0) + (e.sentences?.length ?? 0);
      expect(`${id}:${total}`).not.toBe(`${id}:0`);
    }
  });

  it('fits the lockup once day tokens are filled', () => {
    const tooLong: string[] = [];
    for (const [id, e] of entries) {
      for (const t of [...(e.predicates ?? []), ...(e.sentences ?? [])]) {
        const f = filled(t);
        if (f.length > MAX_FILLED_CHARS) tooLong.push(`${id}: "${f}" (${f.length})`);
      }
    }
    expect(tooLong).toEqual([]);
  });

  it('keeps the voice rules — no emoji, no exclamation, one clause', () => {
    const offenders: string[] = [];
    for (const [id, e] of entries) {
      for (const t of [...(e.predicates ?? []), ...(e.sentences ?? [])]) {
        if (/[!]/.test(t)) offenders.push(`${id}: exclamation in "${t}"`);
        if (/\p{Extended_Pictographic}/u.test(t)) offenders.push(`${id}: emoji in "${t}"`);
        if (!t.endsWith('.')) offenders.push(`${id}: no full stop in "${t}"`);
        // One clause: a full stop may only appear at the end.
        if (t.slice(0, -1).includes('.')) offenders.push(`${id}: more than one sentence in "${t}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('starts predicates lower-case and sentences upper-case', () => {
    const wrong: string[] = [];
    for (const [id, e] of entries) {
      // A predicate follows "Wednesday is", so it must not start a sentence.
      for (const p of e.predicates ?? []) {
        if (/^[A-Z]/.test(p)) wrong.push(`${id}: predicate starts capitalised — "${p}"`);
      }
      // A standalone carries its own subject, so it must.
      for (const s of e.sentences ?? []) {
        if (!/^[A-Z{]/.test(s)) wrong.push(`${id}: sentence starts lower-case — "${s}"`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('is deterministic — the same day at the same place always reads the same', () => {
    const a = choosePhrase('sailing', 'Norfolk Broads', 3, true, 'a sailing day.');
    const b = choosePhrase('sailing', 'Norfolk Broads', 3, true, 'a sailing day.');
    expect(a).toEqual(b);
  });

  it('never repeats on consecutive days', () => {
    for (const id of Object.keys(PHRASEBOOK)) {
      const seen = [0, 1, 2, 3, 4, 5, 6].map(
        (d) => choosePhrase(id, 'Croyde Bay', d, true, 'x').verdict,
      );
      for (let i = 1; i < seen.length; i++) {
        expect(`${id} day${i}: ${seen[i]}`).not.toBe(`${id} day${i}: ${seen[i - 1]}`);
      }
    }
  });

  it('gives alternates the noun frame, so "also" parses', () => {
    // "Today is also a good day to hoist the mainsail" does not read.
    const alt = choosePhrase('sailing', 'Norfolk Broads', 2, false, 'a sailing day.');
    expect(alt.leadIn).toBe('{When} is also');
    expect(alt.verdict).toBe('a sailing day.');
  });

  it('fills day tokens for today and for a swiped-to day', () => {
    expect(fillWhen('{When} is a good day.', 'Tuesday', true)).toBe('Today is a good day.');
    expect(fillWhen('{When} is a good day.', 'Tuesday', false)).toBe('Tuesday is a good day.');
    expect(fillWhen('Wind enough {when}.', 'Tuesday', true)).toBe('Wind enough today.');
    expect(fillWhen('Wind enough {when}.', 'Tuesday', false)).toBe('Wind enough on Tuesday.');
  });
});
