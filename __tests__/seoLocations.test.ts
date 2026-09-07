/**
 * The programmatic estate is only as good as the list of what does not get a page.
 *
 * `data/seoLocations.ts` shipped 8,413 pages while its own header comment said
 * "~2,000", and 3,854 of them were pages whose H1 is a weather question about
 * something the weather does not decide — "Is today a good day for knitting in
 * Reykjavík?", answered with Force 4 gusting Force 7. An `INDOOR_ALWAYS`
 * archetype put nineteen of those at all 106 locations, and `UNIVERSAL`
 * carried eighteen more.
 *
 * `WEATHER_INDEPENDENT` now filters them out at composition. The whole point of
 * that constant is that it is the exact set the `weatherSensitive` flag already
 * knows about, so these tests assert the equality in both directions. Adding a
 * new indoor activity to an archetype fails here rather than quietly publishing
 * another 106 pages; marking an existing one weather-sensitive fails here too,
 * rather than quietly withholding pages it should now have.
 *
 * It is a list and not a runtime import because `data/activityTypes` pulls in
 * every activity definition, and `data/seoLocations` is imported by pages that
 * do not otherwise need them. The cost of that decision is this file.
 */

import {
  SEO_LOCATIONS,
  ACTIVITIES_NEEDING_BEACH,
  WEATHER_INDEPENDENT,
  RETIRED_ACTIVITY_IDS,
  NOT_A_PAGE,
  getAllSeoPagePaths,
  getSeoPageCount,
} from '../data/seoLocations';
import { activityTypes } from '../data/activityTypes';

const byId = new Map(activityTypes.map((a) => [a.id, a]));

/** Every id any archetype or city mentions, before and after the filter. */
const publishedIds = new Set(getAllSeoPagePaths().map((p) => p.activity));

describe('WEATHER_INDEPENDENT matches the weatherSensitive flag', () => {
  it('names only activities the flag agrees are weather-independent', () => {
    const disagreements = [...WEATHER_INDEPENDENT].filter((id) => {
      const activity = byId.get(id);
      // An id that no longer exists belongs in RETIRED_ACTIVITY_IDS, not here.
      return !activity || activity.weatherSensitive === true;
    });
    expect(disagreements).toEqual([]);
  });

  it('publishes no page for an activity the weather does not decide', () => {
    const leaked = [...publishedIds].filter(
      (id) => byId.get(id)?.weatherSensitive === false
    );
    expect(leaked).toEqual([]);
  });
});

describe('every published activity is a real activity', () => {
  it('has a definition in activityTypes', () => {
    // `online` was in INDOOR_ALWAYS and therefore at all 106 locations, so one
    // submitted URL in eighty was a soft 404 — getStaticProps validates against
    // activityTypes and returned notFound every time.
    const unknown = [...publishedIds].filter((id) => !byId.has(id));
    expect(unknown).toEqual([]);
  });

  it('keeps retired ids out of the estate even if an archetype still names one', () => {
    const leaked = [...RETIRED_ACTIVITY_IDS].filter((id) => publishedIds.has(id));
    expect(leaked).toEqual([]);
  });
});

describe('a sea sport needs a beach to be scored as one', () => {
  it('names exactly the activities the requiresBeachOrientation flag names', () => {
    const flagged = activityTypes
      .filter((a) => (a as { requiresBeachOrientation?: boolean }).requiresBeachOrientation)
      .map((a) => a.id)
      .sort();
    expect([...ACTIVITIES_NEEDING_BEACH].sort()).toEqual(flagged);
  });

  it('publishes no sea-sport page at a location with no beach orientation', () => {
    /*
     * `withMarine()` only fetches swell, period and sea temperature where the
     * location declares which way its beach faces. Without them the models skip
     * every criterion that makes the activity what it is, and an absent
     * criterion scores NEUTRAL rather than bad — so the fake coasts beat the
     * real ones. The surfing hub's first render opened on New York, above
     * Newquay and all of Asturias, on a Force 2 wind reading.
     */
    const bad = getAllSeoPagePaths().filter(({ activity, location }) => {
      if (!ACTIVITIES_NEEDING_BEACH.has(activity)) return false;
      const l = SEO_LOCATIONS.find((x) => x.slug === location);
      return l != null && (l.beachFacingDeg === undefined || l.beachFacingDeg === null);
    });
    expect(bad).toEqual([]);
  });

  it('keeps the sea sports at the coasts that do declare one', () => {
    const newquay = SEO_LOCATIONS.find((l) => l.slug === 'newquay-cornwall')!;
    expect(newquay.beachFacingDeg).toBeDefined();
    expect(newquay.activities).toContain('surfing');
    expect(newquay.activities).toContain('sea_swimming');
  });
});

describe('the filter did not empty anything out', () => {
  it('leaves every location with activities to rank', () => {
    const empty = SEO_LOCATIONS.filter((l) => l.activities.length === 0).map((l) => l.slug);
    expect(empty).toEqual([]);
  });

  it('keeps the coastal set intact at a surf town', () => {
    const newquay = SEO_LOCATIONS.find((l) => l.slug === 'newquay-cornwall');
    expect(newquay).toBeDefined();
    // The activities the page exists for. If a prune ever takes these, it has
    // gone much too far.
    for (const id of ['surfing', 'sea_swimming', 'kitesurfing', 'rock_hopping']) {
      expect(newquay!.activities).toContain(id);
    }
  });
});

describe('NOT_A_PAGE is what the middleware serves 410 for', () => {
  it('is the union of both reasons, and nothing else', () => {
    expect([...NOT_A_PAGE].sort()).toEqual(
      [...new Set([...WEATHER_INDEPENDENT, ...RETIRED_ACTIVITY_IDS])].sort()
    );
  });

  it('overlaps the live estate nowhere', () => {
    const overlap = [...publishedIds].filter((id) => NOT_A_PAGE.has(id));
    expect(overlap).toEqual([]);
  });
});

describe('the page count is a measurement, not a comment', () => {
  it('reports the size of the estate the sitemap will submit', () => {
    const { locations, pages } = getSeoPageCount();
    expect(locations).toBe(SEO_LOCATIONS.length);
    expect(pages).toBe(getAllSeoPagePaths().length);
    // A guard rail, not a target. The 8,413 that prompted this work sat four
    // times above the number the file claimed, and nothing failed.
    expect(pages).toBeLessThan(6000);
  });
});
