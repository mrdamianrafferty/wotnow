/**
 * The committed climate numbers (data/climate/normals.json), checked as data.
 *
 * Nothing here recomputes them; it asks whether they are the kind of numbers a
 * public page can print. A bad fetch (an all-zero month, a swapped unit, a
 * place at the wrong coordinates) would otherwise publish as fact on every page
 * for that place.
 */

import file from '../../../data/climate/normals.json';
import { SEO_LOCATIONS } from '../../../data/seoLocations';
import { corePagePaths } from '../tiers';
import { ACTIVITY_MEASURES, MEASURES, monthByMonth, type NormalsFile } from '../climate';

const data = file as unknown as NormalsFile;
const places = Object.entries(data.locations);
const get = (slug: string) => data.locations[slug];
const range = (xs: number[]) => [Math.min(...xs), Math.max(...xs)];

describe('the climate file', () => {
  it('covers a good share of the places that have a core page, and says which it does not', () => {
    // The build is rate-limited by the free archive API (see scripts/build-climate-normals.ts), so
    // coverage grows in batches: running the script again fills the gaps. A place with no entry shows
    // no block, which is the designed behaviour, so this is a floor, not a promise of all 90.
    const wanted = new Set(corePagePaths().map((p) => p.location));
    const have = [...wanted].filter((slug) => data.locations[slug]);
    expect(have.length / wanted.size).toBeGreaterThan(0.4);
  });

  it('names the years it covers, and the marine window is the shorter one', () => {
    expect(data.landYears).toHaveLength(2);
    expect(data.marineYears).toHaveLength(2);
    expect(Number(data.marineYears[0])).toBeGreaterThanOrEqual(Number(data.landYears[0]));
  });

  it('has twelve finite numbers for every measure of every place', () => {
    for (const [slug, entry] of places) {
      for (const [k, series] of Object.entries(entry.land)) {
        expect(series).toHaveLength(12);
        expect(series.every((v: number) => Number.isFinite(v))).toBe(true);
        expect(k in MEASURES).toBe(true);
      }
      for (const series of Object.values(entry.marine ?? {})) {
        expect(series).toHaveLength(12);
        expect(series.every((v: number) => Number.isFinite(v))).toBe(true);
      }
      expect(slug).toBeTruthy();
    }
  });

  it('keeps every figure inside what the planet can do', () => {
    for (const [slug, e] of places) {
      const l = e.land;
      const where = `at ${slug}`;
      const [tmaxLo, tmaxHi] = range(l.maxTemp);
      const [tminLo] = range(l.minTemp);
      expect([where, tmaxLo >= -45 && tmaxHi <= 50]).toEqual([where, true]);
      expect([where, tminLo >= -50]).toEqual([where, true]);
      // a month cannot have a lower daytime high than its own overnight low
      l.maxTemp.forEach((hi, i) => expect([where, i, hi >= l.minTemp[i]]).toEqual([where, i, true]));
      for (const k of ['rainDays', 'snowDays', 'frostDays'] as const) {
        expect([where, k, l[k].every((v) => v >= 0 && v <= 31)]).toEqual([where, k, true]);
      }
      expect([where, l.wind.every((v) => v > 0 && v < 80)]).toEqual([where, true]);
      if (e.marine) {
        expect([where, e.marine.wave.every((v) => v >= 0 && v < 10)]).toEqual([where, true]);
        expect([where, e.marine.seaTemp.every((v) => v >= -3 && v <= 36)]).toEqual([where, true]);
      }
    }
  });

  it('is not a copy of one place under many names', () => {
    const signatures = places.map(([, e]) => JSON.stringify(e.land.maxTemp));
    expect(new Set(signatures).size).toBeGreaterThan(places.length * 0.9);
  });

  it('only gives marine numbers to places on a coast', () => {
    for (const [slug, e] of places) {
      if (!e.marine) continue;
      const loc = SEO_LOCATIONS.find((l) => l.slug === slug)!;
      expect([slug, loc.beachFacingDeg != null || loc.coastal === true]).toEqual([slug, true]);
    }
  });
});

describe('facts anyone can check', () => {
  it('Reykjavik is cold and often frosty in January, mild in July', () => {
    const r = get('reykjavik');
    if (!r) return;
    expect(r.land.maxTemp[0]).toBeLessThan(6);
    expect(r.land.frostDays[0]).toBeGreaterThan(10);
    expect(r.land.maxTemp[6]).toBeGreaterThan(10);
  });

  it('Madrid is hot in July and cool in January', () => {
    const m = get('madrid');
    if (!m) return;
    expect(m.land.maxTemp[6]).toBeGreaterThan(28);
    expect(m.land.maxTemp[0]).toBeLessThan(15);
  });

  it('Newquay has bigger waves in winter than summer, and a warmer sea in late summer than late winter', () => {
    const n = get('newquay-cornwall');
    if (!n?.marine) return;
    expect(n.marine.wave[11]).toBeGreaterThan(n.marine.wave[5]);
    expect(n.marine.seaTemp[7]).toBeGreaterThan(n.marine.seaTemp[1]);
  });
});

describe('what the pages will get', () => {
  it('gives most core pages a block, and never a partial one', () => {
    const pages = corePagePaths();
    const blocks = pages.map(({ activity, location }) => {
      const loc = SEO_LOCATIONS.find((l) => l.slug === location)!;
      return monthByMonth(activity, loc, activity, data);
    });
    const shown = blocks.filter(Boolean).length;
    // Pages at places we have no data for (yet) show nothing, and so do sea activities at places with no sea
    // data: both are left out rather than half-filled. Raise this floor as the data fills in.
    expect(shown / pages.length).toBeGreaterThan(0.4);
    for (const b of blocks) {
      if (!b) continue;
      expect(b.rows.length).toBeGreaterThanOrEqual(3);
      expect(b.rows.every((r) => r.values.length === 12)).toBe(true);
    }
    // every activity in the block has a profile
    expect(Object.keys(ACTIVITY_MEASURES).length).toBeGreaterThanOrEqual(29);
  });
});
