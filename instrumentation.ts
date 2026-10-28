// instrumentation.ts
// Required for Next.js 15 - replaces sentry.server.config.ts and sentry.edge.config.ts

import { serverDsn, tracesSampleRate } from './lib/sentry-config';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: serverDsn(),
      tracesSampleRate: tracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, process.env.NODE_ENV),
      debug: false,
      environment: process.env.NODE_ENV || 'production',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: serverDsn(),
      tracesSampleRate: tracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, process.env.NODE_ENV),
      debug: false,
      environment: process.env.NODE_ENV || 'production',
    });
  }
}
