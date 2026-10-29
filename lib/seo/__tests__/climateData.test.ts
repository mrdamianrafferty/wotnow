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
import { SEA_POINTS } from '../seaPoints';
import { ACTIVITY_MEASURES, MEASURES, monthByMonth, type NormalsFile } from '../climate';

const data = file as unknown as NormalsFile;
const places = Object.entries(data.locations);
const get = (slug: string) => data.locations[slug];
const range = (xs: number[]) => [Math.min(...xs), Math.max(...xs)];

describe('the climate file', () => {
  it('has land data for every place that has a core page', () => {
    const wanted = new Set(corePagePaths().map((p) => p.location));
    const missing = [...wanted].filter((slug) => !data.locations[slug]);
    expect(missing).toEqual([]);
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
        if (e.marine.seaTemp) expect([where, e.marine.seaTemp.every((v) => v >= -3 && v <= 36)]).toEqual([where, true]);
      }
    }
  });

  it('is not a copy of one place under many names', () => {
    const signatures = places.map(([, e]) => JSON.stringify(e.land.maxTemp));
    expect(new Set(signatures).size).toBeGreaterThan(places.length * 0.9);
  });

  it('only gives sea numbers to places that publish a sea activity', () => {
    // Athens, Dublin and New York publish sailing and scuba pages without being flagged `coastal`, so the
    // flag is the wrong test. What matters is that some core page of the place reads waves or sea temperature.
    const seaPlaces = new Set(
      corePagePaths()
        .filter((p) => ACTIVITY_MEASURES[p.activity]?.some((k) => MEASURES[k].source === 'marine'))
        .map((p) => p.location),
    );
    for (const [slug, e] of places) {
      if (!e.marine) continue;
      expect([slug, seaPlaces.has(slug)]).toEqual([slug, true]);
    }
  });

  it('remembers where sea data honestly is not there, and never holds sea numbers for those places', () => {
    const unavailable: string[] = (file as unknown as { marineUnavailable?: string[] }).marineUnavailable ?? [];
    expect(unavailable.length).toBeGreaterThan(0);
    for (const slug of unavailable) expect([slug, data.locations[slug]?.marine === undefined]).toEqual([slug, true]);
  });

  it('gives the Great Lakes cities and Seattle waves but never a water temperature', () => {
    // The wave model covers these waters; no water temperature exists there. It is left out, not borrowed.
    for (const slug of ['chicago', 'milwaukee', 'toronto', 'seattle']) {
      const m = data.locations[slug]?.marine;
      expect([slug, !!m]).toEqual([slug, true]);
      expect([slug, m?.seaTemp === undefined]).toEqual([slug, true]);
      expect([slug, m?.wave.length]).toEqual([slug, 12]);
    }
  });

  it('keeps places with no water at all free of sea numbers', () => {
    for (const slug of ['austin', 'portland-or', 'nicosia']) expect([slug, data.locations[slug]?.marine === undefined]).toEqual([slug, true]);
  });

  it('gives every place with a chosen water point its sea data', () => {
    for (const slug of Object.keys(SEA_POINTS)) expect([slug, !!data.locations[slug]?.marine]).toEqual([slug, true]);
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

describe('the sea, as anyone who has swum there would expect', () => {
  it('is far colder off Reykjavik than off Athens in winter, and frozen-cold in the Baltic', () => {
    const r = get('reykjavik')?.marine;
    const a = get('athens')?.marine;
    const st = get('stockholm')?.marine;
    if (!r || !a || !st) return;
    expect(r.seaTemp[1]).toBeLessThan(5);
    expect(a.seaTemp[1]).toBeGreaterThan(13);
    expect(st.seaTemp[1]).toBeLessThan(2);
  });

  it('is warmest in late summer and coldest in late winter in the northern hemisphere', () => {
    for (const slug of ['new-york', 'boston', 'copenhagen', 'valletta', 'vancouver']) {
      const m = get(slug)?.marine;
      if (!m) continue;
      expect([slug, m.seaTemp[7] > m.seaTemp[1]]).toEqual([slug, true]);
    }
  });

  it('has bigger waves on an open Atlantic coast than in a sheltered Baltic bay', () => {
    const open = get('reykjavik')?.marine;
    const baltic = get('stockholm')?.marine;
    if (!open || !baltic) return;
    expect(Math.max(...open.wave)).toBeGreaterThan(Math.max(...baltic.wave) * 2);
  });
});

describe('the water points that fixed the gaps', () => {
  it('reads Dublin Bay and the Gulf of Riga as the cold northern seas they are', () => {
    const d = get('dublin')?.marine;
    const r = get('riga')?.marine;
    if (!d?.seaTemp || !r?.seaTemp) return;
    expect(d.seaTemp[1]).toBeGreaterThan(6);
    expect(d.seaTemp[1]).toBeLessThan(11);
    expect(d.seaTemp[7]).toBeGreaterThan(13);
    expect(r.seaTemp[1]).toBeLessThan(3);
    expect(r.seaTemp[7]).toBeGreaterThan(17);
  });

  it('reads the Gulf coast as hot in summer and Puget Sound as sheltered', () => {
    const h = get('houston')?.marine;
    const s = get('seattle')?.marine;
    const m = get('milwaukee')?.marine;
    if (h?.seaTemp) expect(h.seaTemp[7]).toBeGreaterThan(28);
    if (s && m) expect(Math.max(...s.wave)).toBeLessThan(Math.max(...m.wave));
  });

  it('has bigger Great Lakes waves in the stormy months than in midsummer', () => {
    for (const slug of ['chicago', 'milwaukee', 'toronto']) {
      const m = get(slug)?.marine;
      if (!m) continue;
      expect([slug, Math.max(m.wave[0], m.wave[10], m.wave[11]) > m.wave[6]]).toEqual([slug, true]);
    }
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
    // The pages left out are swimming, diving and beach pages where there is no water temperature (the Great Lakes,
    // Puget Sound) and sea activities at places with no water at all: left out rather than half-filled.
    expect(shown / pages.length).toBeGreaterThan(0.95);
    for (const b of blocks) {
      if (!b) continue;
      expect(b.rows.length).toBeGreaterThanOrEqual(3);
      expect(b.rows.every((r) => r.values.length === 12)).toBe(true);
    }
    // every activity in the block has a profile
    expect(Object.keys(ACTIVITY_MEASURES).length).toBeGreaterThanOrEqual(29);
  });
});
