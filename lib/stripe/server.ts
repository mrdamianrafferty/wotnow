/**
 * Stripe Server-Side Client
 *
 * Server-only Stripe instance for API routes and server components.
 * Uses secret key from environment variables.
 *
 * @module lib/stripe/server
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

/**
 * Stripe client instance configured for server-side operations.
 *
 * Features:
 * - Uses account's default API version (safer for production)
 * - TypeScript types enabled
 * - App info for request tracking in Stripe dashboard
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Use account's default API version (safer than hardcoding)
  typescript: true,
  // This repo serves Go Daisy and Grow Daisy. It used to identify itself as
  // 'Findr' / fishfindr.eu — a leftover from before findr moved to its own
  // repo — so every request from both apps was tagged as findr in the Stripe
  // dashboard. Since all the Daisy apps currently share ONE Stripe account,
  // that mislabelling actively hampers exactly the kind of per-app audit the
  // shared account makes necessary. Keep this accurate.
  appInfo: {
    name: 'Go Daisy & Grow Daisy',
    version: '1.0.0',
    url: 'https://godaisy.io',
  },
});
