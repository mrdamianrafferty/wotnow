/**
 * Every country in the dataset must have a region, or it drops off the map.
 *
 * The hub's by-region block is the navigation half of the page — the ranking
 * answers "where is good today" and this answers "where could I get to". It is
 * built by grouping the activity's spots through `regionForCountry`, and a
 * country with no region silently produces no group: its spot pages keep
 * existing and stop being linked from the one page that indexes them.
 *
 * That is the orphaning the hub was built to end, so it fails here instead.
 */

import { SEO_LOCATIONS } from '../data/seoLocations';
import { MACRO_REGIONS, regionForCountry, groupByRegion } from '../data/seoRegions';

describe('every country has exactly one region', () => {
  it('places every country the dataset actually uses', () => {
    const unmapped = [...new Set(SEO_LOCATIONS.map((l) => l.country))]
      .filter((c) => !regionForCountry(c))
      .sort();
    expect(unmapped).toEqual([]);
  });

  it('never lists a country in two regions', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const region of MACRO_REGIONS) {
      for (const country of region.countries) {
        if (seen.has(country)) {
          duplicates.push(`${country} in both ${seen.get(country)} and ${region.label}`);
        }
        seen.set(country, region.label);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('has no region that the dataset never reaches', () => {
    // A heading nothing can ever fall under is dead weight in the file and a
    // promise the estate does not keep.
    const used = new Set(SEO_LOCATIONS.map((l) => l.country));
    const empty = MACRO_REGIONS
      .filter((r) => !r.countries.some((c) => used.has(c)))
      .map((r) => r.label);
    expect(empty).toEqual([]);
  });
});

describe('groupByRegion', () => {
  it('keeps the declared display order rather than sorting alphabetically', () => {
    // Britain and Ireland leads on purpose: the curated set is densest there
    // and so is the readership. Alphabetical would open on Central Europe.
    const grouped = groupByRegion(
      SEO_LOCATIONS.map((l) => ({ country: l.country, slug: l.slug })),
    );
    const order = grouped.map((g) => g.label);
    const declared = MACRO_REGIONS.map((r) => r.label).filter((l) => order.includes(l));
    expect(order).toEqual(declared);
    expect(order[0]).toBe('Britain and Ireland');
  });

  it('drops regions with nothing in them', () => {
    // Surfing does not happen in Central Europe, and a heading over an empty
    // column is a broken page.
    const grouped = groupByRegion([
      { country: 'United Kingdom', slug: 'newquay-cornwall' },
      { country: 'Spain', slug: 'salinas-asturias' },
    ]);
    expect(grouped.map((g) => g.label)).toEqual(['Britain and Ireland', 'Iberia']);
    for (const g of grouped) expect(g.items.length).toBeGreaterThan(0);
  });

  it('loses nothing it was given', () => {
    const items = SEO_LOCATIONS.map((l) => ({ country: l.country, slug: l.slug }));
    const total = groupByRegion(items).reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(items.length);
  });
});
