/**
 * Soil moisture is said in words, not as a percentage.
 *
 * The values here are real readings from the 92-day sample the bands were cut
 * from (see `underfoot` in lib/godaisy/call/readings.ts).
 */
import { underfoot, rowsFor } from '@/lib/godaisy/call/readings';
import { EVIDENCE_SECTIONS } from '@/lib/godaisy/call/evidence';

const ground = EVIDENCE_SECTIONS.find((s) => s.id === 'ground')!;

describe('underfoot', () => {
  it.each([
    [0.048, 'Hard and dry'], // Madrid, September
    [0.12, 'Hard and dry'], // London, dry September
    [0.208, 'Firm'], // London, October median
    [0.287, 'Soft'], // Newquay, a dry spell
    [0.343, 'A bit soggy'], // Newquay median
    [0.38, 'Muddy'], // Newquay, today
    [0.43, 'Very muddy'], // Keswick, wet week
  ])('%s reads as %s', (m, words) => {
    expect(underfoot(m, 8)).toBe(words);
  });

  it('puts each cut-off in the wetter band', () => {
    expect(underfoot(0.15)).toBe('Firm');
    expect(underfoot(0.25)).toBe('Soft');
    expect(underfoot(0.32)).toBe('A bit soggy');
    expect(underfoot(0.37)).toBe('Muddy');
    expect(underfoot(0.41)).toBe('Very muddy');
  });

  it('calls frozen ground hard, however wet', () => {
    expect(underfoot(0.43, 0)).toBe('Frozen hard');
    expect(underfoot(0.43, -3)).toBe('Frozen hard');
    expect(underfoot(0.43, 0.5)).toBe('Very muddy');
  });

  it('says nothing without a reading', () => {
    expect(underfoot(undefined, 5)).toBeNull();
    expect(underfoot(Number.NaN)).toBeNull();
  });
});

describe('the Underfoot row', () => {
  it('replaces the percentage', () => {
    const rows = rowsFor(ground, { soil: { temp0cm: 10.5, temp6cm: 10.1, moisture0to1: 0.38 } });
    expect(rows).toContainEqual({ label: 'Underfoot', value: 'Muddy' });
    expect(rows.some((r) => r.value.endsWith('%'))).toBe(false);
  });

  it('is left out when there is no moisture reading', () => {
    const rows = rowsFor(ground, { soil: { temp0cm: 10.5 } });
    expect(rows.map((r) => r.label)).not.toContain('Underfoot');
  });
});
