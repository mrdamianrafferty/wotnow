/**
 * GA4 measurement IDs, one property per domain. Single source of truth for
 * pages/_app.tsx (which loads gtag.js) and lib/analytics/events.ts (which only
 * sends events through that existing gtag).
 *
 * Findr is deliberately excluded — the live Findr app lives in its own repo
 * (fishfindr.eu) and carries its own tag, so firing GA from the legacy /findr
 * routes here would double-count.
 */
export const GA_MEASUREMENT_IDS: Record<'godaisy' | 'grow', string> = {
  godaisy: 'G-0YDQB1067L',
  grow: 'G-S895QHFGQH',
};

/** The measurement ID _app.tsx loads for the current page, or undefined (Findr / SSR). */
export function getCurrentGaId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const { hostname, pathname } = window.location;
  if (hostname.includes('fishfindr.eu') || pathname.startsWith('/findr')) return undefined;
  if (hostname.includes('grow.') || pathname.startsWith('/grow')) return GA_MEASUREMENT_IDS.grow;
  return GA_MEASUREMENT_IDS.godaisy;
}
