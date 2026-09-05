/**
 * A place somebody chose, as the forecast pipeline expects one.
 *
 * The pipeline is built around `SeoLocation` — hand-written towns with curated
 * activity lists — because those were the only places `/call` could serve.
 * Onboarding lets a person name anywhere, so their choice is dressed as one,
 * with a synthetic `setup:lat,lon` slug that is never routed to.
 *
 * MOVED OUT OF `pages/call.tsx` BECAUSE THE SHARE RENDERER NEEDED IT AND DID
 * NOT HAVE IT. `/api/call/share` looked its place up in `SEO_LOCATIONS` and
 * 404'd on anything else — so for every person who typed their own town in
 * onboarding, which is everyone who onboards, the card was a 46-byte JSON error
 * body wearing a `.png` name, and the message text was that same error. The
 * screenshot that found it read `the-call.png · 46 bytes`, and 46 is the exact
 * length of `{"error":"Unknown place: setup:43.514,-5.270"}`.
 *
 * @module lib/godaisy/call/location
 */

import type { SeoLocation } from '@/data/seoLocations';
import type { CallSetup } from './setup';

/** How a chosen place is named in a URL. Parsed back by `coordsFromSlug`. */
export function setupSlug(lat: number, lon: number): string {
  return `setup:${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/** The coordinates back out of a synthetic slug, or null if it is a real one. */
export function coordsFromSlug(slug: string): { lat: number; lon: number } | null {
  const m = /^setup:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(slug);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  // A slug is user input by the time it reaches the share renderer — it arrives
  // in a query string anybody can type — and these coordinates go into an
  // outbound forecast URL.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

interface SyntheticInput {
  lat: number;
  lon: number;
  name: string;
  /** Their sports, not a curated list — that is the point. */
  activities: string[];
  coastal?: boolean;
}

function synthesise({ lat, lon, name, activities, coastal }: SyntheticInput): SeoLocation {
  return {
    slug: setupSlug(lat, lon),
    name,
    region: '',
    country: '',
    lat,
    lon,
    // A place they named, in a timezone we have not asked for. The forecast is
    // fetched in UTC and the dayparts are cut on those stamps, so this is only
    // ever a label — but it is a real limitation, and the reason a call a long
    // way east or west can put "morning" an hour out.
    timezone: 'UTC',
    activities,
    // Water sports need somewhere to do them. A coastal spot marks the setup as
    // coastal without claiming to know which way the beach faces — a wrong
    // facing is worse than none, because the wind-relative criteria would score
    // an offshore day as onshore.
    beachFacingDeg: null,
    ...(coastal ? { coastal: true } : {}),
  };
}

/** The place a person set up, for the screen they set it up for. */
export function locationFromSetup(setup: CallSetup): SeoLocation {
  return synthesise({
    lat: setup.place.lat,
    lon: setup.place.lon,
    name: setup.place.name,
    activities: setup.sports,
    ...(setup.coastal ? { coastal: true } : {}),
  });
}

/**
 * The same place, rebuilt from a share URL.
 *
 * ONE ACTIVITY, NOT THREE. The renderer's job is to draw the card that was on
 * the screen when somebody pressed Send, and the sender's full sports list is
 * not in the URL — re-deriving a ranking from a different list is how the card
 * ends up disagreeing with the screen it came from. Passing the one activity
 * makes them agree by construction rather than by coincidence.
 */
export function locationFromShare(
  slug: string,
  name: string,
  activityId: string,
): SeoLocation | null {
  const coords = coordsFromSlug(slug);
  if (!coords) return null;
  return synthesise({
    ...coords,
    // A name is a label on a card. Empty is better than a wrong one, and the
    // template already copes with a place it cannot name.
    name: name || 'here',
    activities: [activityId],
  });
}
