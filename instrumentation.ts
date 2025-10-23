// instrumentation.ts
// Required for Next.js 15 - replaces sentry.server.config.ts and sentry.edge.config.ts

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    const SENTRY_DSN =
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1,
      debug: false,
      environment: process.env.NODE_ENV || 'production',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    const SENTRY_DSN =
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1,
      debug: false,
      environment: process.env.NODE_ENV || 'production',
    });
  }
}
