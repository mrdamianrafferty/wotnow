/**
 * The hub is the rung that was never built, so its contract is worth pinning.
 *
 * `pages/[activity]/` held only `[location].tsx`: `/surfing` returned 404 while
 * `/surfing/newquay-cornwall` rendered, and 4,559 spot pages sat two segments
 * deep reachable only from the sitemap. The hub is what a crawler descends
 * through and what a reader arrives on from a head term, so the things these
 * tests hold are the things that make it either of those:
 *
 *   - it exists only where it has enough places to rank
 *   - the ranking is honest — best first, and nothing it could not price
 *   - an upstream failure is a 500, never a cached 404 over a real page
 *   - every spot is in the HTML, so the crawl path down is not behind a click
 */

import type { GetStaticPropsContext } from 'next';

const getActivityScoreForLocation = jest.fn();

jest.mock('../lib/seo/getActivityScore', () => ({
  getActivityScoreForLocation: (...args: unknown[]) => getActivityScoreForLocation(...args),
  fetchForecastForLocation: jest.fn(),
}));

jest.mock('next/dynamic', () => () => () => null);

import { getStaticProps } from '../pages/[activity]/index';
import { activitiesWithHubs, HUB_MIN_SPOTS } from '../lib/seo/hubs';
import { getLocationsForActivity, getAllSeoPagePaths } from '../data/seoLocations';

const ctx = (activity: string) =>
  ({ params: { activity } }) as unknown as GetStaticPropsContext;

/** A score payload shaped like the real one, with a settable number. */
const payload = (todayScore: number) => ({
  todayScore,
  todayReasoning: 'Offshore and clean.',
  weeklyOutlook: [],
  bestDay: null,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('which activities earn a hub', () => {
  it('requires at least HUB_MIN_SPOTS places', () => {
    for (const id of activitiesWithHubs()) {
      expect(getLocationsForActivity(id).length).toBeGreaterThanOrEqual(HUB_MIN_SPOTS);
    }
  });

  it('excludes the activities that exist at a single location', () => {
    // Hurling and Gaelic football are at Dublin and nowhere else. A page headed
    // "Where is good for hurling today?" answering with one city is the thin
    // content the prune removed 3,854 pages to get away from.
    const hubs = new Set(activitiesWithHubs());
    const thin = [...new Set(getAllSeoPagePaths().map((p) => p.activity))].filter(
      (id) => getLocationsForActivity(id).length < HUB_MIN_SPOTS,
    );
    expect(thin.length).toBeGreaterThan(0);
    for (const id of thin) expect(hubs.has(id)).toBe(false);
  });

  it('covers everything else that has pages', () => {
    const withPages = new Set(getAllSeoPagePaths().map((p) => p.activity));
    const hubs = new Set(activitiesWithHubs());
    const missing = [...withPages].filter(
      (id) => getLocationsForActivity(id).length >= HUB_MIN_SPOTS && !hubs.has(id),
    );
    expect(missing).toEqual([]);
  });
});

describe('a URL that is not a hub returns notFound', () => {
  it('rejects an activity that does not exist', async () => {
    const result = await getStaticProps(ctx('competitive-napping'));
    expect(result).toMatchObject({ notFound: true });
    expect(getActivityScoreForLocation).not.toHaveBeenCalled();
  });

  it('rejects a retired activity', async () => {
    // `knitting` was at all 106 locations before the prune and is now in
    // WEATHER_INDEPENDENT, so it has no spots at all.
    const result = await getStaticProps(ctx('knitting'));
    expect(result).toMatchObject({ notFound: true });
  });

  it('rejects an activity with too few spots to rank', async () => {
    const result = await getStaticProps(ctx('hurling-camogie'));
    expect(result).toMatchObject({ notFound: true });
    expect(getActivityScoreForLocation).not.toHaveBeenCalled();
  });
});

describe('the ranking', () => {
  it('scores every spot the activity has, and orders them best first', async () => {
    const spots = getLocationsForActivity('surfing');
    // Descending input, so a pass-through would look sorted; give it ascending.
    let n = 0;
    getActivityScoreForLocation.mockImplementation(async () => payload((n++ % 90) + 5));

    const result = await getStaticProps(ctx('surfing'));
    expect('props' in result).toBe(true);
    const props = (result as { props: { ranked: Array<{ score: number }> } }).props;

    expect(getActivityScoreForLocation).toHaveBeenCalledTimes(spots.length);
    expect(props.ranked).toHaveLength(spots.length);

    const scores = props.ranked.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('drops a spot it could not price rather than ranking it 0/100', async () => {
    const spots = getLocationsForActivity('surfing');
    let call = 0;
    getActivityScoreForLocation.mockImplementation(async () =>
      call++ < 3 ? null : payload(50),
    );

    const result = await getStaticProps(ctx('surfing'));
    const props = (result as { props: { ranked: Array<{ score: number }> } }).props;

    // Silence is not a bad day. On a page whose claim is "ranked best first",
    // a row of noughts is a lie about the sea.
    expect(props.ranked).toHaveLength(spots.length - 3);
    expect(props.ranked.every((r) => r.score > 0)).toBe(true);
  });

  it('throws rather than caching a 404 when nothing can be scored', async () => {
    getActivityScoreForLocation.mockResolvedValue(null);

    // The same rule as the leaf pages: a busy forecast API is a 500, because
    // Google reads 404 as gone and 5xx as come back — and Vercel will serve a
    // cached 404 stale for a further request after the outage lifts.
    await expect(getStaticProps(ctx('surfing'))).rejects.toThrow(
      /refusing to cache a 404 for a hub that exists/,
    );
  });
});

describe('the navigation halves', () => {
  beforeEach(() => {
    getActivityScoreForLocation.mockImplementation(async () => payload(60));
  });

  it('indexes every spot by region, losing none of them', async () => {
    const result = await getStaticProps(ctx('surfing'));
    const props = (result as {
      props: { regions: Array<{ label: string; items: unknown[] }>; ranked: unknown[] };
    }).props;

    const indexed = props.regions.reduce((n, r) => n + r.items.length, 0);
    // The by-region block indexes the whole curated set, not just what scored —
    // it is a map, and a place does not leave the map because the API was busy.
    expect(indexed).toBe(getLocationsForActivity('surfing').length);
    for (const r of props.regions) expect(r.items.length).toBeGreaterThan(0);
  });

  it('offers siblings that share these places, and never itself', async () => {
    const result = await getStaticProps(ctx('surfing'));
    const props = (result as { props: { siblings: Array<{ id: string; url: string }> } }).props;

    expect(props.siblings.length).toBeGreaterThan(0);
    expect(props.siblings.map((s) => s.id)).not.toContain('surfing');

    // Every sibling is itself a hub, or the chip is a 404.
    const hubs = new Set(activitiesWithHubs());
    for (const s of props.siblings) expect(hubs.has(s.id)).toBe(true);

    // Weighted by share of THIS activity's spots, so the sea sports beat
    // running — which is everywhere and tells a surfer nothing.
    const ids = props.siblings.map((s) => s.id);
    const sea = ids.findIndex((id) => id === 'sea_swimming');
    const running = ids.findIndex((id) => id === 'running');
    if (sea !== -1 && running !== -1) expect(sea).toBeLessThan(running);
  });
});
