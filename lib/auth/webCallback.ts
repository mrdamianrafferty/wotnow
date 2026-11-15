import { Capacitor } from '@capacitor/core';

/**
 * Mark a sign-in return address as "finish this in the browser".
 *
 * `public/.well-known/apple-app-site-association` claims `/auth/callback` for
 * the native apps, so that sign-ins started inside an app come back to it. The
 * side effect: a sign-in started in Safari — on a Mac that has the Go Daisy
 * iPhone app installed, or on an iPhone — was handed to the app at the last
 * step, and the app cannot finish it, because the PKCE code verifier lives in
 * the browser that started the flow.
 *
 * The association file excludes `/auth/callback?via=web`, so a sign-in that
 * starts in a browser carries the marker and finishes where it began. Inside
 * the native app the address is left alone, which keeps every flow that
 * relies on the app opening — magic links and password resets requested from
 * the app — exactly as it was.
 *
 * Supabase's redirect allowlist accepts the query string (checked against the
 * auth logs: an unlisted host falls back to the site URL, these do not).
 */
export const WEB_CALLBACK_PARAM = 'via';
export const WEB_CALLBACK_VALUE = 'web';

export function markWebCallback(url: string): string {
  if (Capacitor.isNativePlatform()) return url;
  // Custom schemes (growdaisy://) are app deep links, not web pages.
  if (!/^https?:\/\//.test(url)) return url;
  const u = new URL(url);
  u.searchParams.set(WEB_CALLBACK_PARAM, WEB_CALLBACK_VALUE);
  return u.toString();
}
