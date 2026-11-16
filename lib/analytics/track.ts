/**
 * GA4 tracking — one typed entry point for product events
 * ─────────────────────────────────────────────────────────────────────────────
 * This repo serves two GA4 properties from one tag: Go Daisy (godaisy.io,
 * G-0YDQB1067L) and Grow Daisy (grow.godaisy.io and /grow, G-S895QHFGQH).
 * pages/_app.tsx loads gtag.js once with the property for the page you landed
 * on (lib/analytics/gaIds.ts); every event here goes to that property.
 *
 * Every product event goes through `track()`, so names and parameters can't
 * drift between call sites. New events use GA4's recommended names where one
 * exists (sign_up, login, begin_checkout, share, generate_lead,
 * tutorial_complete), so GA's standard reports fill in on their own. Events
 * that already had history (call_shared, cross_promo_click, …) keep their names.
 *
 * Money events (start_trial, purchase) are NOT sent from here: the Stripe and
 * RevenueCat webhooks send them through the Measurement Protocol
 * (lib/analytics/measurement-protocol.ts), so an ad blocker, the native
 * WebView or a closed tab can't lose one and a reload can't count one twice.
 *
 * gtag.js loads in production only, so elsewhere every call is a no-op. Set
 * localStorage `daisy:ga-debug` = '1' to log what would be sent instead.
 *
 * Never put an email address, name, typed free text or raw Supabase id in a
 * parameter.
 */

import { GA_MEASUREMENT_IDS, type GaApp } from './gaIds';

type GtagFn = (..._args: unknown[]) => void;

function gtag(): GtagFn | null {
  if (typeof window === 'undefined') return null;
  const fn = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof fn === 'function' ? fn : null;
}

function debugOn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('daisy:ga-debug') === '1';
  } catch {
    return false;
  }
}

/**
 * Calls made before the tag is ready. _app loads gtag.js `afterInteractive`,
 * which is after the first effects run: without this, the first page's
 * content_group, the user_id and anything tracked on mount were dropped. The
 * ga-init script in _app dispatches `daisy:ga-ready` straight after `config`
 * and before the first page_view, and the queue is flushed then. Outside
 * production nothing ever dispatches it, so the queue is capped.
 */
const READY_EVENT = 'daisy:ga-ready';
const MAX_QUEUE = 100;
let ready = false;
const queue: unknown[][] = [];

function flush(gaId: string | undefined): void {
  ready = true;
  // The landing page's section and kill-switch go in first, so the first
  // page_view (sent by ga-init right after this) carries them.
  if (gaId) prepareForPath(gaId, window.location.pathname);
  const fn = gtag();
  for (const args of queue.splice(0)) fn?.(...args);
}

if (typeof window !== 'undefined') {
  window.addEventListener(READY_EVENT, (e) => flush((e as CustomEvent<{ id?: string }>).detail?.id));
}

function send(...args: unknown[]): void {
  const fn = gtag();
  if (fn && ready) {
    fn(...args);
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push(args);
  if (debugOn()) console.info('[ga]', ...args);
}

/**
 * The inline script _app runs to start GA for one property. Exported so the
 * order (config without a page_view, ready, then page_view) is tested rather
 * than hoped for.
 */
export function gaInitScript(gaId: string): string {
  const id = JSON.stringify(gaId);
  return [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    'window.gtag = gtag;',
    "gtag('js', new Date());",
    `gtag('config', ${id}, { send_page_view: false });`,
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(READY_EVENT)}, { detail: { id: ${id} } }));`,
    "gtag('event', 'page_view');",
  ].join('\n');
}

/** How a person signed in. Matches Supabase's app_metadata.provider values. */
export type AuthMethod = 'email' | 'apple' | 'google' | 'other';

/** How a share left the app (lib/godaisy/call/share.ts ShareResult.method). */
export type ShareMethod = 'native' | 'web_share' | 'clipboard' | 'none';

type Bool = boolean;

/** Parameters each event takes. Add an event here before calling it. */
export interface EventParams {
  // ── Identity (AnalyticsIdentity) ───────────────────────────────────────────
  sign_up: { method: AuthMethod };
  login: { method: AuthMethod };

  // ── Money, client side: the intent only. The result comes from webhooks. ──
  begin_checkout: { product: string; product_kind: 'tip' | 'subscription' | 'lifetime'; surface: string; value?: number; currency?: string };

  // ── Go Daisy core actions ──────────────────────────────────────────────────
  /** /start finished: sports, place and (maybe) hour chosen. GA recommended name. */
  tutorial_complete: { sports_count: number; has_coastal: Bool; has_hour: Bool };
  /** A call place, coastal place or call hour saved after onboarding. */
  save_location: { kind: 'place' | 'coastal' | 'hour'; method: 'search' | 'gps' | 'pick'; surface: string };
  /** The answer to the browser's / OS's notification prompt. */
  push_permission: { result: 'granted' | 'denied' | 'prompt' | 'unsupported'; surface: string };
  /** A push subscription actually saved for this device. */
  enable_notifications: { surface: string };
  /** The call rendered with a verdict — Go Daisy's "used it" moment. Once per page load. */
  view_call: { activity_id: string; band: string; day_index: number; alternates: number; place_kind: 'spot_page' | 'own_place' };
  /** GA recommended; sent alongside call_shared / conditions_shared. */
  share: { method: ShareMethod; content_type: 'call' | 'conditions'; item_id: string };

  // ── Go Daisy events with history (kept names) ──────────────────────────────
  call_shared: { activity_id: string; day_index: number; band: string; with_card: Bool; method: ShareMethod; place_kind: 'spot_page' | 'own_place' };
  call_share_failed: { activity_id: string; stage: 'text' | 'card' | 'send'; reason: string };
  call_alternate_viewed: { activity_id: string; day_index: number; position: number; of: number };
  call_why_opened: { day_index: number; activity: string; band: string };
  conditions_numbers_opened: { day: number; from_call: Bool };
  conditions_shared: { section: string; day: number; method: ShareMethod; with_card: Bool };
  cross_promo_view: { from_app: string; placement: string };
  cross_promo_click: { from_app: string; to_app: string; placement: string };
  rate_link_click: { placement: string; platform: string };
  review_requested: { moment: string; platform: string };

  // ── Daisy Studio ──────────────────────────────────────────────────────────
  generate_lead: { lead_source: 'studio_brief'; surface: string };
}

export type EventName = keyof EventParams;

export function track<E extends EventName>(name: E, params: EventParams[E]): void {
  send('event', name, params);
}

/** Which property a page belongs to. Findr paths return null (no tag here). */
export function appForLocation(hostname: string, pathname: string): GaApp | null {
  if (hostname.includes('fishfindr.eu') || /^\/findr(\/|$)/.test(pathname)) return null;
  if (hostname.startsWith('grow.') || /^\/grow(\/|$)/.test(pathname)) return 'grow';
  return 'godaisy';
}

const GROW_LANG = /^\/grow\/(fr|es|de|it|pt|nl|en)(?=\/|$)/;

/** Section of the site a path belongs to — GA4's content_group. */
export function contentGroupFor(rawPath: string): string {
  const path = (rawPath.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';

  if (/^\/grow(\/|$)/.test(path)) {
    const rest = path.replace(GROW_LANG, '/grow');
    const [, , section = ''] = rest.split('/');
    switch (section) {
      case '':
        return 'grow_home';
      case 'garden':
      case 'plan':
      case 'activities':
      case 'species':
      case 'weather':
      case 'guidance':
      case 'onboarding':
      case 'settings':
        return `grow_${section}`;
      case 'premium':
        return 'grow_pricing';
      case 'privacy':
      case 'terms':
      case 'cookies':
        return 'grow_legal';
      default:
        return 'grow_other';
    }
  }

  if (path === '/' || path === '/call') return 'call';
  const [, first = ''] = path.split('/');
  switch (first.toLowerCase()) {
    case 'weather':
    case 'whether-weather':
      return 'conditions';
    case 'start':
      return 'onboarding';
    case 'account':
      return 'account';
    case 'support':
      return 'support';
    case 'login':
    case 'auth':
      return 'auth';
    case 'studio':
      return 'studio';
    case 'activities':
      return 'activities';
    case 'share':
    case 'invite':
    case 'poll':
      return 'shared_link';
    case 'app':
      return 'get_app';
    case 'privacy':
    case 'privacypolicy':
    case 'terms':
    case 'termsandconditions':
    case 'cookies':
    case 'cookiepolicy':
      return 'legal';
    case 'faq':
    case 'faqs':
    case 'aboutus':
    case 'howwedoit':
      return 'about';
    case 'admin':
      return 'admin';
    default:
      // /<activity> and /<activity>/<place>: the SEO activity pages.
      return 'activity_page';
  }
}

/**
 * Paths that must not count in GA: admin screens and dev / test pages. The tag
 * stays loaded (one script for the whole app), so these are switched off with
 * GA's own `ga-disable-<id>` flag, which gtag checks on every hit.
 */
export function isUntrackedPath(rawPath: string): boolean {
  const p = rawPath.split(/[?#]/)[0] || '/';
  return /^\/(admin|dev|demo|test|internal)(\/|$)/.test(p) || /^\/api\//.test(p);
}

/**
 * Hosts whose hits count. Vercel preview deploys build with
 * NODE_ENV=production, so gtag loads there too; without this every preview
 * someone opened landed in the live properties. Capacitor's iOS build loads
 * godaisy.io itself, so it passes.
 */
export function isTrackedHost(hostname: string): boolean {
  return /^(www\.)?godaisy\.io$/.test(hostname) || hostname === 'grow.godaisy.io';
}

/** The path as the site sees it: grow.godaisy.io serves /grow/* at its root. */
export function canonicalPath(hostname: string, path: string): string {
  if (hostname.startsWith('grow.') && !/^\/grow(\/|$)/.test(path)) return `/grow${path === '/' ? '' : path}`;
  return path;
}

/**
 * Switch GA hits on or off for the page about to show, and tag its section.
 * `gaId` is the property _app loaded; it doesn't change on client navigation.
 */
export function prepareForPath(gaId: string, path: string): void {
  if (typeof window === 'undefined') return;
  const { hostname } = window.location;
  const full = canonicalPath(hostname, path);
  (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] =
    !isTrackedHost(hostname) || isUntrackedPath(full);
  send('set', { content_group: contentGroupFor(full) });
}

export interface AnalyticsUserProperties {
  platform: 'web' | 'ios' | 'android';
  signed_in: 'yes' | 'no';
  /** 'free' | 'plus' (Go Daisy) / 'seed' | 'sprout' | … (Grow) | 'unknown' while loading */
  pro_status: string;
}

export function setUserProperties(props: AnalyticsUserProperties): void {
  send('set', 'user_properties', props);
}

/** GA user_id: a one-way hash of the Supabase id (see analyticsUserId). null clears it. */
export function setUserId(hashedId: string | null): void {
  send('set', { user_id: hashedId ?? undefined });
}

/**
 * The id GA sees for a signed-in person: the first 32 hex characters of
 * SHA-256("<app>:" + Supabase user id), app = 'godaisy' | 'grow'. The server
 * computes the same value (measurement-protocol.ts analyticsUserIdServer), so
 * web, app and webhook events join on one user within each property.
 */
export async function analyticsUserId(app: GaApp, supabaseUserId: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const bytes = new TextEncoder().encode(`${app}:${supabaseUserId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * GA's client id from the `_ga` cookie ("GA1.1.123.456" → "123.456"), so a
 * server-side purchase lands in the same session as the browser. null before
 * gtag has set the cookie or when cookies are blocked.
 */
export function gaClientId(cookie: string = typeof document === 'undefined' ? '' : document.cookie): string | null {
  const m = cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
  return m ? m[1] : null;
}

/** Supabase's provider string → our AuthMethod. */
export function authMethodOf(provider: unknown): AuthMethod {
  return provider === 'email' || provider === 'apple' || provider === 'google' ? provider : 'other';
}

/** Section for an event's `surface` when the caller doesn't know it. */
export function currentSurface(): string {
  return typeof window === 'undefined'
    ? 'server'
    : contentGroupFor(canonicalPath(window.location.hostname, window.location.pathname));
}

export { GA_MEASUREMENT_IDS };
