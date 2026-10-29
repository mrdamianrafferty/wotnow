/**
 * The core tier: which spot pages the sitemap leads with.
 *
 * Against the real dataset, like the sitemap test: a tier that quietly emptied
 * or swallowed the whole estate would pass any test that stubbed the data.
 */

import { SEO_LOCATIONS, getAllSeoPagePaths } from '../data/seoLocations';
import { GENERIC_ACTIVITY_SHARE, activityLocationCounts, corePagePaths, isCorePage, placeSpecificActivities } from '../lib/seo/tiers';

describe('the core tier', () => {
  it('is the pages where the place decides the activity', () => {
    for (const activity of ['surfing', 'skiing', 'rock_climbing', 'ice_skating', 'kitesurfing']) {
      expect(isCorePage(activity)).toBe(true);
    }
  });

  it('leaves out the activities that exist at every location', () => {
    for (const activity of ['archery', 'rugby', 'running', 'cycling', 'padel', 'coarse_fishing']) {
      expect(isCorePage(activity)).toBe(false);
    }
  });

  it('is a few hundred pages: well under the whole estate, well above the nine statics', () => {
    const core = corePagePaths().length;
    const all = getAllSeoPagePaths().length;
    expect(core).toBeGreaterThan(300);
    expect(core).toBeLessThan(1200);
    expect(core).toBeLessThan(all / 2);
  });

  it('only ever names pages that exist, once each', () => {
    const all = new Set(getAllSeoPagePaths().map((p) => `${p.activity}/${p.location}`));
    const core = corePagePaths().map((p) => `${p.activity}/${p.location}`);
    expect(core.every((k) => all.has(k))).toBe(true);
    expect(new Set(core).size).toBe(core.length);
  });

  it('is decided by how widely an activity is published, not by a list', () => {
    const limit = SEO_LOCATIONS.length * GENERIC_ACTIVITY_SHARE;
    const counts = activityLocationCounts();
    for (const activity of placeSpecificActivities()) expect(counts.get(activity)!).toBeLessThanOrEqual(limit);
    for (const [activity, n] of counts) if (n > limit) expect(isCorePage(activity)).toBe(false);
  });

  it('is the same on every call', () => {
    expect(corePagePaths()).toEqual(corePagePaths());
  });
});
