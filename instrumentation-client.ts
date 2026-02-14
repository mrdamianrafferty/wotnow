// instrumentation-client.ts
// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const getSentryDSN = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Use different DSN based on domain
    if (hostname.includes('fishfindr.eu')) {
      return process.env.NEXT_PUBLIC_SENTRY_DSN_FINDR;
    } else if (hostname.includes('godaisy.io')) {
      return process.env.NEXT_PUBLIC_SENTRY_DSN_GODAISY;
    }
  }

  // Default DSN (Findr for localhost/other domains)
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
};

Sentry.init({
  dsn: getSentryDSN(),

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment
  environment: process.env.NODE_ENV || 'production',

  // Set initial scope with app tag
  initialScope: {
    tags: {
      app:
        typeof window !== 'undefined' &&
        window.location.hostname.includes('fishfindr.eu')
          ? 'findr'
          : 'godaisy',
    },
  },

  // Filter out benign errors that don't affect user experience
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Ignore AbortError - happens when requests are cancelled (navigation, app backgrounding)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }

    // Also check error message for AbortError pattern
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message?.includes('AbortError'))
    ) {
      return null;
    }

    // Ignore network errors from fetch being aborted
    if (
      event.exception?.values?.some(
        (e) => e.type === 'AbortError' || e.value?.includes('AbortError')
      )
    ) {
      return null;
    }

    return event;
  },
});
