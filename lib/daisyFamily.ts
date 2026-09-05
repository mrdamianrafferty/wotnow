/**
 * The apps, and where Go Daisy sends people — phase 6.
 *
 * One list, because there were two and they had already drifted: the footer
 * carried three siblings and the landing page carried its own App Store URL
 * with a different slug from the real one. A second list is a list that will be
 * wrong, and these appear on ~2,000 indexed spot pages.
 *
 * Go Daisy is the umbrella app, so it links out to every sibling. The
 * specialists link only to the one or two relevant to their audience, which is
 * why this file is Go Daisy's and not shared with them.
 *
 * @module lib/daisyFamily
 */

/**
 * The App Store listing.
 *
 * The slug is Apple's own — `go-daisy-the-active-life-app`, not the shortened
 * `go-daisy` the landing page had. Apple resolves on the id and ignores the
 * slug, so the old one worked; it just was not the app's name.
 */
export const APP_STORE_URL =
  'https://apps.apple.com/gb/app/go-daisy-the-active-life-app/id6755695873';

export const APP_STORE_NAME = 'Go Daisy — The Active Life App';

/**
 * Where the QR codes point, and why it is not the App Store directly.
 *
 * A QR is printed, screenshotted and shared; it outlives whatever it encodes.
 * Pointing it at `/app` means the destination can change — a Play listing when
 * Android ships, a different territory, a landing page — without every code
 * already in the world going stale. It also lets the page route by platform,
 * which a store URL cannot: an Android phone scanning an App Store link gets an
 * apology, and here it gets the web app.
 */
export const APP_LINK_PATH = '/app';

export interface FamilyApp {
  label: string;
  /** For the `cross_promo_click` event's `to_app`. */
  toApp: string;
  url: string;
  /** One line, in the app's own terms — not marketing. */
  blurb: string;
}

const utm = (url: string, placement: string) => {
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}utm_source=go_daisy&utm_medium=cross_promo&utm_content=${placement}`;
};

const APPS: ReadonlyArray<Omit<FamilyApp, 'url'> & { base: string }> = [
  { label: 'Grow Daisy',     toApp: 'grow_daisy',     base: 'https://grow.godaisy.io/grow', blurb: 'What to plant, and when' },
  { label: 'Grewp',          toApp: 'grewp',          base: 'https://grewp.org',            blurb: 'Local gardening groups' },
  { label: 'Findr',          toApp: 'findr',          base: 'https://fishfindr.eu',         blurb: 'Where the fish are' },
  { label: 'Rise Daisy',     toApp: 'rise_daisy',     base: 'https://www.risedaisy.com',    blurb: 'Rivers, and what is hatching' },
  { label: 'Fly Cast Coach', toApp: 'fly_cast_coach', base: 'https://flycastcoach.com',     blurb: 'Casting, coached' },
];

/**
 * The family, tagged for wherever they are being shown.
 *
 * `placement` lands in the UTM and in the analytics event, so a footer link and
 * a spot-page link are told apart — which is the only way to find out whether
 * the spot pages send anyone anywhere.
 */
export function daisyFamily(placement: string): FamilyApp[] {
  return APPS.map(({ base, ...rest }) => ({ ...rest, url: utm(base, placement) }));
}
