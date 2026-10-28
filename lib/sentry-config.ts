/**
 * Shared Sentry settings for the server, edge and browser inits.
 *
 * NEXT_PUBLIC_SENTRY_DSN is Findr's DSN, so Go Daisy never falls back to it.
 */

/** Go Daisy's server/edge DSN: SENTRY_DSN, then the Go Daisy browser DSN. */
export function serverDsn(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.SENTRY_DSN?.trim() || env.NEXT_PUBLIC_SENTRY_DSN_GODAISY?.trim() || undefined;
}

/**
 * Trace sample rate: an explicit 0–1 override wins, otherwise 0.1 in
 * production and 1 everywhere else. Unparseable overrides are ignored.
 */
export function tracesSampleRate(override: string | undefined, nodeEnv: string | undefined): number {
  const parsed = override?.trim() ? Number(override) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  return nodeEnv === 'production' ? 0.1 : 1;
}
