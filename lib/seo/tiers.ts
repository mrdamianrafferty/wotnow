/**
 * Which spot pages are worth asking Google to index first.
 *
 * Search Console's URL Inspection, on a sample of 20 pages spread across the
 * sitemap (29 Oct 2026): none indexed. Seventeen "Discovered – currently not
 * indexed" (Google has seen the URL and not spent a crawl on it), three
 * unknown. The sitemap offered 4,420 URLs at one priority; Google read that as
 * a large, flat, templated estate on a young domain and did not look.
 *
 * What the estate looks like from outside: thirty activities exist at all 106
 * locations, so 3,180 of 4,348 pages (73%) are "archery in Washington DC" and
 * "rugby in Vaduz" — pages whose only difference from their siblings is the
 * place name and today's weather. The other 683 are the opposite: an activity
 * that only makes sense at some places (surfing, skiing, climbing, ice
 * skating), where the page is the answer to a question people actually ask of
 * that place.
 *
 * So the tier is about the activity, not the city. An activity found at more
 * than half of the places is generic; one found at half or fewer is
 * place-specific, and its pages are the core. Nothing is deleted and nothing is
 * noindexed: the long tail stays live, linked and crawlable, it simply is not
 * what the sitemap leads with. Promoting a page into the core later (when it has
 * content that earns it) is one change here.
 *
 * Derived from the dataset, not listed, so it stays true as locations are
 * added: a new activity found at only a few places is core on arrival.
 *
 * @module lib/seo/tiers
 */

import { SEO_LOCATIONS, getAllSeoPagePaths } from '../../data/seoLocations';

/** An activity at more than this share of the locations is generic. */
export const GENERIC_ACTIVITY_SHARE = 0.5;

/** How many locations each activity is published at. */
export function activityLocationCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { activity } of getAllSeoPagePaths()) counts.set(activity, (counts.get(activity) ?? 0) + 1);
  return counts;
}

/** Activities that only make sense at some places. */
export function placeSpecificActivities(): Set<string> {
  const limit = SEO_LOCATIONS.length * GENERIC_ACTIVITY_SHARE;
  return new Set([...activityLocationCounts()].filter(([, n]) => n <= limit).map(([activity]) => activity));
}

/** The pages the sitemap leads with: every (activity, location) of a place-specific activity. */
export function corePagePaths(): Array<{ activity: string; location: string }> {
  const specific = placeSpecificActivities();
  return getAllSeoPagePaths().filter(({ activity }) => specific.has(activity));
}

export function isCorePage(activity: string): boolean {
  return placeSpecificActivities().has(activity);
}
