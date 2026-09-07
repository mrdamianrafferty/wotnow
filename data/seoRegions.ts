/**
 * The macro-regions the activity hubs group their spots by.
 *
 * The hub's ranked table answers "where is good today" honestly — best first,
 * across everywhere with a page. That ranking is the point, and it is also
 * useless as navigation: a reader in Cornwall does not scroll a hundred and six
 * rows looking for somewhere they could actually drive to.
 *
 * So the hub carries the ranking AND a by-region block underneath it, which is
 * how the design handoff resolves the open question about ranking Reykjavík
 * against San Diego on one list. The list stays global and dated — "ranked on
 * today, the order changes every hour" — and the regions are the map.
 *
 * WHY NOT GROUP BY `country`. Forty-seven of them, most holding a single
 * capital, which produces a link block of forty-seven headings with one item
 * each. That is a worse index than no index. These eight are editorial and they
 * are meant to be: the unit is "somewhere a person might plausibly go instead".
 *
 * Every country in `SEO_LOCATIONS` must appear exactly once below, and
 * `__tests__/seoRegions.test.ts` fails if one is added without a home. An
 * unmapped country would otherwise vanish from every hub's index while keeping
 * its pages — the orphaning this whole exercise exists to undo.
 *
 * @module data/seoRegions
 */

export interface MacroRegion {
  /** Shown as the column heading in the hub's by-region block. */
  readonly label: string;
  readonly countries: readonly string[];
}

/**
 * Ordered as they are displayed: the home markets first, then outward.
 *
 * Not alphabetical. Go Daisy is made in the UK and Asturias, its curated set is
 * densest there, and a reader is far likelier to be in Britain than in Kosovo.
 * The order is a claim about who is reading.
 */
export const MACRO_REGIONS: readonly MacroRegion[] = [
  {
    label: 'Britain and Ireland',
    countries: ['United Kingdom', 'Ireland'],
  },
  {
    label: 'Iberia',
    countries: ['Spain', 'Portugal', 'Andorra'],
  },
  {
    label: 'France and the Low Countries',
    countries: ['France', 'Belgium', 'Netherlands', 'Luxembourg', 'Monaco'],
  },
  {
    label: 'The Nordics and Iceland',
    countries: ['Norway', 'Sweden', 'Denmark', 'Finland', 'Iceland', 'Estonia', 'Latvia', 'Lithuania'],
  },
  {
    label: 'Central Europe',
    countries: [
      'Germany', 'Austria', 'Switzerland', 'Czech Republic', 'Poland',
      'Slovakia', 'Hungary', 'Liechtenstein', 'Slovenia',
    ],
  },
  {
    label: 'The Mediterranean and the Balkans',
    countries: [
      'Italy', 'Greece', 'Croatia', 'Malta', 'Cyprus', 'San Marino', 'Serbia',
      'Bosnia and Herzegovina', 'Montenegro', 'Albania', 'North Macedonia',
      'Kosovo', 'Bulgaria', 'Romania', 'Moldova',
    ],
  },
  {
    label: 'Eastern Europe',
    countries: ['Ukraine', 'Belarus'],
  },
  {
    label: 'North America',
    countries: ['United States', 'Canada', 'Mexico'],
  },
];

const REGION_BY_COUNTRY: ReadonlyMap<string, string> = new Map(
  MACRO_REGIONS.flatMap((r) => r.countries.map((c) => [c, r.label] as const)),
);

/**
 * The region a country belongs to, or `undefined` if it has no home yet.
 *
 * Undefined rather than a catch-all bucket: a country nobody has placed should
 * fail the test loudly, not quietly become "Elsewhere" on ninety hub pages.
 */
export function regionForCountry(country: string): string | undefined {
  return REGION_BY_COUNTRY.get(country);
}

/**
 * Group anything carrying a country into the display order above.
 *
 * Regions with nothing in them are dropped — most activities are not practised
 * in all eight, and a heading over an empty column is a broken page.
 */
export function groupByRegion<T extends { country: string }>(
  items: readonly T[],
): Array<{ label: string; items: T[] }> {
  return MACRO_REGIONS.map(({ label }) => ({
    label,
    items: items.filter((i) => regionForCountry(i.country) === label),
  })).filter((g) => g.items.length > 0);
}
