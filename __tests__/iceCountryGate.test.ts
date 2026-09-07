/**
 * Standing on frozen water, which no forecast we have can tell you is safe.
 *
 * `ice_skating`, `ice_fishing` and `ice_hockey` were scored on today's air
 * temperature and nothing else. Skating's perfect band is -5..-1 °C and ice
 * fishing vetoes above zero — both plainly written for NATURAL ice, because a
 * refrigerated rink does not care what the air is doing.
 *
 * Ice thickness is a function of how many consecutive freezing days there have
 * been, not of today. A -3 °C morning after a mild week has an inch of ice on
 * it and will drown you, and the model called it perfect. There is no fix
 * inside the weather: thickness needs a history the forecast does not carry and
 * an observation nobody publishes.
 *
 * So the activity is withheld where it is not a real activity.
 *
 * ─── Why country, and not latitude ───────────────────────────────────────
 *
 * Latitude is the obvious axis and the wrong one. Maritime Britain and Ireland
 * sit at 51-58°N with no reliable natural ice at all; continental Europe and
 * Canada have it a long way further south. The Gulf Stream is the whole story
 * and it does not follow a parallel.
 *
 * The list is an ALLOW-list, so an unknown country withholds rather than
 * offers: somewhere missing costs a rare page, somewhere wrongly present costs
 * somebody walking onto thin water.
 */

import { SEO_LOCATIONS, ACTIVITIES_NEEDING_RELIABLE_ICE, COUNTRIES_WITH_RELIABLE_ICE } from '../data/seoLocations';
import { locationFromSetup } from '../lib/godaisy/call/location';

const ICE = [...ACTIVITIES_NEEDING_RELIABLE_ICE];

const setupAt = (country?: string) => locationFromSetup({
  v: 1, sports: ['ice_skating', 'ice_fishing', 'ice_hockey', 'dog_walking', 'hiking'],
  place: { name: 'Somewhere', lat: 55, lon: 0, ...(country ? { country } : {}) },
} as never);

describe('the spot estate', () => {
  it('offers an ice activity only where the ice is reliable', () => {
    const offending = SEO_LOCATIONS.filter(
      (l) => l.activities.some((a) => ACTIVITIES_NEEDING_RELIABLE_ICE.has(a))
        && !COUNTRIES_WITH_RELIABLE_ICE.has(l.country),
    );
    expect(offending.map((l) => `${l.name}, ${l.country}`)).toEqual([]);
  });

  it('still offers them where it is', () => {
    const kept = SEO_LOCATIONS.filter((l) => l.activities.some((a) => ACTIVITIES_NEEDING_RELIABLE_ICE.has(a)));
    expect(kept.length).toBeGreaterThan(0);
    for (const l of kept) expect(COUNTRIES_WITH_RELIABLE_ICE.has(l.country)).toBe(true);
  });

  it('has not withheld anything else in the process', () => {
    // dog walking is on most of the estate and must be untouched by this.
    expect(SEO_LOCATIONS.some((l) => l.activities.includes('dog_walking'))).toBe(true);
  });
});

describe('the Call', () => {
  it.each(['Sweden', 'Canada', 'Finland', 'Norway'])('offers them in %s', (country) => {
    for (const a of ICE) expect(setupAt(country).activities).toContain(a);
  });

  it.each(['United Kingdom', 'Ireland', 'Spain', 'Portugal'])('withholds them in %s', (country) => {
    for (const a of ICE) expect(setupAt(country).activities).not.toContain(a);
  });

  it('withholds them when the country is unknown', () => {
    // Every cookie written before the country was captured. Being ignorant
    // must not read as being somewhere cold.
    for (const a of ICE) expect(setupAt(undefined).activities).not.toContain(a);
  });

  it('leaves every other sport alone, in every country', () => {
    /*
     * Only the ice rule is applied on this path, not the whole of
     * `canScoreHere` — that also withholds the beach activities from a location
     * with no facing, and a synthesised setup never has one. Running it whole
     * would silently drop surfing and sea swimming from every coastal setup.
     */
    for (const country of ['United Kingdom', 'Sweden', undefined]) {
      const a = setupAt(country).activities;
      expect(a).toContain('dog_walking');
      expect(a).toContain('hiking');
    }
  });

  it('does not withhold indoor ice hockey, which is a rink', () => {
    expect(ACTIVITIES_NEEDING_RELIABLE_ICE.has('ice_hockey_indoor')).toBe(false);
  });
});
