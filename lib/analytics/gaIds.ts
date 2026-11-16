/**
 * GA4 measurement IDs, one property per domain. Single source of truth for
 * pages/_app.tsx (which loads gtag.js), lib/analytics/track.ts (which sends
 * events through that gtag) and lib/analytics/measurement-protocol.ts (which
 * sends the webhooks' money events to the right property).
 *
 * Findr is deliberately excluded — the live Findr app lives in its own repo
 * (fishfindr.eu) and carries its own tag, so firing GA from the legacy /findr
 * routes here would double-count.
 */

/** The two GA4 properties this repo serves. */
export type GaApp = 'godaisy' | 'grow';

export const GA_MEASUREMENT_IDS: Record<GaApp, string> = {
  godaisy: 'G-0YDQB1067L',
  grow: 'G-S895QHFGQH',
};
