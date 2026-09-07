/**
 * A busy weather API must not deindex the estate.
 *
 * `getStaticProps` returned `notFound` whenever the forecast came back empty,
 * which turns a transient upstream failure into 404 for a URL that exists, is
 * in the sitemap, and was rendering a minute earlier.
 *
 * It was measured, not theorised. On the preview deployment a cold ISR cache
 * generated several spot pages at once, Open-Meteo answered 429 to all of them,
 * and every page became a cached 404:
 *
 *   GET /running/london 404 [error/serverless] cache=MISS
 *     [getActivityScore] Open-Meteo failed for london: Open-Meteo forecast failed: 429
 *
 * Vercel then served that 404 stale while revalidating behind it, so it
 * outlived the rate limit by a further request. Google reads 404 as "gone" and
 * 5xx as "come back"; throwing gets the second, caches nothing, and during
 * background revalidation leaves a previously good page in place rather than
 * replacing it with a 404.
 *
 * The distinction these tests pin is the whole point, and it is easy to undo by
 * "tidying" a throw back into a `notFound`:
 *
 *   this URL is not a page          → notFound   (no retry will change it)
 *   we could not build it right now → throw      (a retry very well might)
 */

import type { GetStaticPropsContext } from 'next';

const fetchForecastForLocation = jest.fn();
const getActivityScoreForLocation = jest.fn();

jest.mock('../lib/seo/getActivityScore', () => ({
  fetchForecastForLocation: (...args: unknown[]) => fetchForecastForLocation(...args),
  getActivityScoreForLocation: (...args: unknown[]) => getActivityScoreForLocation(...args),
}));

// The page pulls the footer in through next/dynamic and Leaflet-adjacent code
// via GetTheApp; none of it participates in getStaticProps.
jest.mock('next/dynamic', () => () => () => null);

import { getStaticProps } from '../pages/[activity]/[location]';
import { SEO_LOCATIONS } from '../data/seoLocations';

/** A real (activity, location) pair from the dataset, so the guards pass. */
const NEWQUAY = SEO_LOCATIONS.find((l) => l.slug === 'newquay-cornwall')!;

const ctx = (activity: string, location: string) =>
  ({ params: { activity, location } }) as unknown as GetStaticPropsContext;

/** Seven days of nothing in particular — enough to get past the length check. */
const FORECAST = Array.from({ length: 7 }, (_, i) => ({
  date: 1_757_200_000 + i * 86_400,
  weather: {},
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('a URL that is not a page returns notFound', () => {
  it('rejects an unknown location without asking for a forecast', async () => {
    const result = await getStaticProps(ctx('surfing', 'atlantis'));
    expect(result).toMatchObject({ notFound: true });
    expect(fetchForecastForLocation).not.toHaveBeenCalled();
  });

  it('rejects an activity the location does not do', async () => {
    // Madrid is inland; surfing is not in its list.
    const result = await getStaticProps(ctx('surfing', 'madrid'));
    expect(result).toMatchObject({ notFound: true });
    expect(fetchForecastForLocation).not.toHaveBeenCalled();
  });

  it('rejects an activity that does not exist at all', async () => {
    const result = await getStaticProps(ctx('competitive-napping', NEWQUAY.slug));
    expect(result).toMatchObject({ notFound: true });
    expect(fetchForecastForLocation).not.toHaveBeenCalled();
  });

  it('rejects a retired activity, which is no longer in any location list', async () => {
    // `knitting` was at all 106 locations and is now in WEATHER_INDEPENDENT.
    const result = await getStaticProps(ctx('knitting', 'reykjavik'));
    expect(result).toMatchObject({ notFound: true });
  });
});

describe('a page we could not build right now throws, and is never a 404', () => {
  it('throws when the forecast is unavailable', async () => {
    fetchForecastForLocation.mockResolvedValue([]);

    await expect(getStaticProps(ctx('surfing', NEWQUAY.slug))).rejects.toThrow(
      /No forecast for newquay-cornwall/
    );
  });

  it('throws when the activity cannot be scored', async () => {
    fetchForecastForLocation.mockResolvedValue(FORECAST);
    getActivityScoreForLocation.mockResolvedValue(null);

    await expect(getStaticProps(ctx('surfing', NEWQUAY.slug))).rejects.toThrow(
      /No score for surfing at newquay-cornwall/
    );
  });

  it('never returns notFound for an upstream failure', async () => {
    fetchForecastForLocation.mockResolvedValue([]);

    // The assertion that matters: not "it throws" but "it does not 404".
    // A `notFound` here is what got the estate deindexed under a 429.
    const result = await getStaticProps(ctx('surfing', NEWQUAY.slug)).catch(
      (e: Error) => e
    );
    expect(result).toBeInstanceOf(Error);
  });
});

describe('the forecast for this place is fetched once, not once per activity', () => {
  it('shares one forecast across every same-location score', async () => {
    fetchForecastForLocation.mockResolvedValue(FORECAST);
    getActivityScoreForLocation.mockImplementation(async () => ({
      todayScore: 60,
      todayReasoning: '',
      weeklyOutlook: [{ date: '2026-09-07', dayLabel: 'Today', score: 60, evaluation: 'fair', reasoning: '' }],
      bestDay: null,
    }));

    await getStaticProps(ctx('surfing', NEWQUAY.slug));

    /*
     * Exactly one direct fetch for this location. Every same-location score is
     * handed that forecast through `prefetched`, which the page did not pass
     * for the first year of its life — nine of its nineteen requests were the
     * identical call.
     */
    const forThisPlace = fetchForecastForLocation.mock.calls.filter(
      ([loc]) => (loc as { slug: string }).slug === NEWQUAY.slug
    );
    expect(forThisPlace).toHaveLength(1);

    // And every same-location call received it rather than fetching its own.
    const sameLocationCalls = getActivityScoreForLocation.mock.calls.filter(
      ([, loc]) => (loc as { slug: string }).slug === NEWQUAY.slug
    );
    expect(sameLocationCalls.length).toBeGreaterThan(1);
    for (const call of sameLocationCalls) {
      expect(call[3]).toBe(FORECAST);
    }
  });

  it('caps how many other locations it asks about', async () => {
    fetchForecastForLocation.mockResolvedValue(FORECAST);
    getActivityScoreForLocation.mockImplementation(async () => ({
      todayScore: 60,
      todayReasoning: '',
      weeklyOutlook: [{ date: '2026-09-07', dayLabel: 'Today', score: 60, evaluation: 'fair', reasoning: '' }],
      bestDay: null,
    }));

    await getStaticProps(ctx('surfing', NEWQUAY.slug));

    // Other locations fetch their own — that is unavoidable, a different place
    // is a different request — but the candidate set is capped so a crawl of
    // the estate does not multiply into a rate limit.
    const otherPlaces = getActivityScoreForLocation.mock.calls.filter(
      ([, loc]) => (loc as { slug: string }).slug !== NEWQUAY.slug
    );
    expect(otherPlaces.length).toBeLessThanOrEqual(12);
  });
});
