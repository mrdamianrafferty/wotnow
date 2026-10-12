/**
 * @jest-environment node
 *
 * translation_cache has a trigger (normalize_quotes_on_upsert) that straightens
 * curly quotes in source_text, so lookups must normalise the same way. This pins
 * the JS copy to the SQL function's rules.
 */
import { normalizeQuotes } from '../lib/translation/normalizeQuotes';

describe('normalizeQuotes (mirror of the SQL normalize_quotes function)', () => {
  it('straightens curly double and single quotes', () => {
    expect(normalizeQuotes('Hardy kiwi, also known as “baby kiwi”, is the plant’s name'))
      .toBe('Hardy kiwi, also known as "baby kiwi", is the plant\'s name');
    expect(normalizeQuotes('‘single’')).toBe("'single'");
  });

  it('turns em and en dashes into hyphens and the ellipsis into three dots', () => {
    expect(normalizeQuotes('2–3 inches — or so…')).toBe('2-3 inches - or so...');
  });

  it('turns a non-breaking space into a plain space', () => {
    expect(normalizeQuotes('1 inch')).toBe('1 inch');
  });

  it('leaves plain text alone', () => {
    expect(normalizeQuotes("plain text with 'straight' quotes")).toBe("plain text with 'straight' quotes");
  });
});
