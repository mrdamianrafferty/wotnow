/**
 * What this person told us — phase 4.
 *
 * Three things: sports, spots, hour. Before this, `/call` could only be reached
 * by typing a URL with `?place=` in it, and the three sports were the app's
 * guess from a list of a dozen seeded places. A verdict about a sport someone
 * does not do, at a place they do not live, is not a product.
 *
 * IT IS A COOKIE, and that is the whole design decision.
 *
 * `/call` renders on the server. Read the setup from localStorage instead and
 * the server renders the seeded default, then the client corrects it — so the
 * first thing a returning user sees is somebody else's forecast, replaced. A
 * cookie is the only client-writable store `getServerSideProps` can read, so
 * the right answer is in the first byte of HTML. It also works signed-out,
 * which matters: onboarding exists for strangers, and a stranger has no account.
 *
 * The cookie is NOT the system of record. It is a cache of a decision, mirrored
 * into `preferences` in localStorage so the rest of the app sees it, and
 * eventually into Supabase for anyone signed in. Losing it costs a person one
 * pass through `/start`, which is the correct price for a cookie.
 *
 * @module lib/godaisy/call/setup
 */

import { allSports } from '@/data/activities';

export const SETUP_COOKIE = 'godaisy.call.setup';

/** A year. The decision is not one people revisit often. */
export const SETUP_MAX_AGE = 60 * 60 * 24 * 365;

export interface SetupPlace {
  name: string;
  lat: number;
  lon: number;
}

export interface CallSetup {
  /** Bumped when the shape changes, so an old cookie is dropped, not misread. */
  v: 1;
  /** Activity ids, in the order chosen. Seeded three, never capped at three. */
  sports: string[];
  place: SetupPlace;
  /** Where they go for water sports, when that is somewhere else. */
  coastal?: SetupPlace;
  /** Local hour the call arrives, 0-23. Absent until they pick one. */
  hour?: number;
}

const VALID_SPORTS: ReadonlySet<string> = new Set(
  (allSports as Array<{ id: string }>).map((a) => a.id),
);

/**
 * What everybody starts with.
 *
 * An empty first screen asks a stranger to describe themselves before the app
 * has shown them anything, and a call with no sports in it has nothing to be
 * about. These four are the ones almost nobody would call wrong: they need no
 * kit, no club and no skill, and between them they cover a bright afternoon, a
 * warm lunchtime, a mild hour sitting still and a clear night — so the seven
 * days have something to say whatever the week does.
 *
 * They are a starting point, not a guess at who you are. Every one is a chip
 * you can tap off on the first screen.
 *
 * Reading is here as `outdoor_reading` ("Read in the Park") rather than
 * `reading`, which is the indoor one. A café was wanted too, and the library
 * has no outdoor equivalent of it, so it is deliberately absent: both `cafe`
 * and `reading` are `weatherSensitive: false`, and the setup screen filters
 * those out on purpose — indoor things are what a write-off offers *instead*,
 * and scoring "visit a café" against the forecast would return a perfect day
 * every day of the year. The café is already in the write-off prompt's
 * library, which is where a day the weather has ruined goes looking.
 */
export const DEFAULT_SPORTS: readonly string[] = [
  'urban_exploring',  // Go for a Walk
  'picnicking',       // Have a Picnic
  'outdoor_reading',  // Read in the Park
  'stargazing',       // Go Stargazing
];

/**
 * Parse a cookie into a setup, or return null.
 *
 * A COOKIE IS USER INPUT. This value reaches `fetchForecastForLocation`, which
 * puts its coordinates into an outbound URL, and reaches the scorer, which
 * looks activity ids up in the library. Anything unvalidated here is a hand-
 * written cookie deciding what the server fetches, so every field is checked
 * rather than trusted: ids against the real library, coordinates against the
 * range they can occupy on a planet, the hour against a clock.
 *
 * Returns null rather than a partial setup — half a decision would render a
 * call about the right sports at the wrong place, which is worse than the
 * default, because it looks deliberate.
 */
export function parseSetup(raw: string | undefined | null): CallSetup | null {
  if (!raw) return null;
  try {
    const json = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(raw)))
      : Buffer.from(raw, 'base64').toString('utf8');
    const d = JSON.parse(json) as Partial<CallSetup>;
    if (d?.v !== 1) return null;

    const sports = Array.isArray(d.sports)
      ? d.sports.filter((s): s is string => typeof s === 'string' && VALID_SPORTS.has(s)).slice(0, 12)
      : [];
    if (!sports.length) return null;

    const place = parsePlace(d.place);
    if (!place) return null;

    const coastal = parsePlace(d.coastal);
    const hour = typeof d.hour === 'number' && Number.isInteger(d.hour) && d.hour >= 0 && d.hour <= 23
      ? d.hour
      : undefined;

    return { v: 1, sports, place, ...(coastal ? { coastal } : {}), ...(hour !== undefined ? { hour } : {}) };
  } catch {
    return null;
  }
}

function parsePlace(p: unknown): SetupPlace | null {
  if (!p || typeof p !== 'object') return null;
  const { name, lat, lon } = p as Partial<SetupPlace>;
  if (typeof name !== 'string' || !name.trim()) return null;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  // A name is printed in the kicker and baked into the share card, so it is
  // length-capped here rather than trusted to lay out.
  return { name: name.trim().slice(0, 60), lat, lon };
}

/** The cookie value for a setup. Base64 so a place name with a comma survives. */
export function encodeSetup(setup: CallSetup): string {
  const json = JSON.stringify(setup);
  return typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
}

/** Read the setup out of a `Cookie:` header. Server side. */
export function setupFromCookieHeader(header: string | undefined): CallSetup | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== SETUP_COOKIE) continue;
    return parseSetup(decodeURIComponent(part.slice(eq + 1).trim()));
  }
  return null;
}

/**
 * Write the setup, client side.
 *
 * Not `HttpOnly` — the page that collects it is the page that writes it, and a
 * server round-trip to set a preference nobody else can see would be ceremony.
 * `SameSite=Lax` so it survives someone arriving from a shared link, which is
 * the traffic this whole redesign is betting on. `Secure` everywhere but
 * localhost, because a cookie without it is dropped on https and silently kept
 * on http, and "works locally, not in production" is the worst failure shape.
 */
export function writeSetup(setup: CallSetup): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${SETUP_COOKIE}=${encodeURIComponent(encodeSetup(setup))}` +
    `; Path=/; Max-Age=${SETUP_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Read the setup, client side. */
export function readSetup(): CallSetup | null {
  if (typeof document === 'undefined') return null;
  return setupFromCookieHeader(document.cookie);
}

/**
 * Mirror the setup into the store the rest of the app already reads.
 *
 * `UserPreferencesContext` keeps `{ locations, interests }` under `preferences`
 * in localStorage, and `/weather`, `/activities` and the home screen all read
 * it. Writing only the cookie would give someone a call about kayaking at
 * Salcombe and a dashboard about dog walking in London, which reads as two
 * apps. This merges rather than replaces: nothing else in there is ours to
 * throw away.
 */
export function mirrorToPreferences(setup: CallSetup): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('preferences');
    const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const locations = [
      { name: setup.place.name, lat: setup.place.lat, lon: setup.place.lon, type: 'home' },
      ...(setup.coastal
        ? [{ name: setup.coastal.name, lat: setup.coastal.lat, lon: setup.coastal.lon, type: 'coastal' }]
        : []),
    ];
    window.localStorage.setItem(
      'preferences',
      JSON.stringify({ ...prefs, locations, interests: setup.sports }),
    );
  } catch {
    // A private window, or storage that is full. The cookie is the one that
    // decides what the call says; this is only so the older screens agree.
  }
}
