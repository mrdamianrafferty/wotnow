/**
 * Which activities earn a hub at `/[activity]`.
 *
 * Its own module because three pages need the answer and none of them should
 * import another page to get it. `pages/activities.tsx` was importing
 * `pages/[activity]/index` for exactly this, and the landing page's chip row —
 * the thing that finally links the homepage to the estate — would have had to
 * do the same, pulling a whole ISR page and its scoring imports into the
 * bundle of the most important page on the site.
 *
 * @module lib/seo/hubs
 */

import { getAllSeoPagePaths } from '../../data/seoLocations';

/**
 * The fewest spots a hub can rank and still be a page rather than a redirect.
 *
 * Two activities — hurling and Gaelic football — exist at exactly one location.
 * A page headed "Where is good for hurling today?" that answers with Dublin and
 * only Dublin is the thin content this whole exercise removed 3,854 pages to
 * get away from. They keep their spot page and are reached from `/activities`
 * directly.
 */
export const HUB_MIN_SPOTS = 3;

/** Every activity with enough spots to rank. Shared with `/activities`. */
export function activitiesWithHubs(): string[] {
  const counts = new Map<string, number>();
  for (const { activity } of getAllSeoPagePaths()) {
    counts.set(activity, (counts.get(activity) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= HUB_MIN_SPOTS)
    .map(([id]) => id)
    .sort();
}
