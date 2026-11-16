/**
 * Whether the signed-in user record shows a new sign-in to report to GA, and
 * which kind. Pure, so it can be tested without auth (AnalyticsIdentity uses it).
 *
 * Supabase re-emits SIGNED_IN on tab refocus and every token refresh, so the
 * auth event can't be counted. The user record can: `last_sign_in_at` only
 * moves on a real sign-in.
 */

/** A sign-in older than this when first seen on the device is an old session, not a new sign-in. */
const FRESH_SIGN_IN_MS = 10 * 60 * 1000;
/** An account created this close to the sign-in is a new account. */
const NEW_ACCOUNT_MS = 2 * 60 * 1000;

export function signInKind(
  createdAt: string | undefined,
  lastSignInAt: string | undefined,
  seenBefore: string | null,
  now: number,
): 'sign_up' | 'login' | null {
  if (!lastSignInAt || lastSignInAt === seenBefore) return null;
  const signedIn = Date.parse(lastSignInAt);
  if (!Number.isFinite(signedIn) || now - signedIn > FRESH_SIGN_IN_MS) return null;
  const created = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(created) && Math.abs(signedIn - created) <= NEW_ACCOUNT_MS ? 'sign_up' : 'login';
}
