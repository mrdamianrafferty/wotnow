/**
 * Go Daisy+ — remnant.
 *
 * **Go Daisy+ was removed on 5 September 2026.** Nothing in the app reads a tier
 * or enforces a limit any more, and there is nothing to buy. The last gate to go
 * was `pages/api/godaisy/planned-activities.ts`, which read
 * `godaisy_subscription_tier` off `profiles` directly rather than through the
 * helpers here — which is why the first sweep, done by grepping for this module,
 * missed it. Nobody ever subscribed: at removal there were
 * zero rows in `godaisy_subscription_events`, zero profiles with a Stripe
 * subscription id, zero with a RevenueCat product id, and all 177 users on
 * `free`. The paywall gated the redesign — a three-day forecast cap and a
 * coastal-location lock make a daily activity call impossible to build — so it
 * had to go before anything else could start.
 *
 * What survives here is two type aliases, and only because
 * `pages/api/stripe/webhook.ts` and `pages/api/revenuecat/webhook.ts` still
 * reference `GoDaisyTier` in their now-unreachable Go Daisy branches. Those
 * webhooks are the live payment path for **Grow Daisy**, which does monetise, so
 * they were deliberately left alone: editing a working revenue webhook to delete
 * code that can no longer be reached is a poor trade.
 *
 * Nothing can produce a `metadata.app === 'godaisy_plus'` event any more — the
 * checkout session endpoint that set it is gone — so those branches are dead by
 * construction rather than by assertion.
 *
 * **To finish the job**, in a change of its own and with care: strip the Go Daisy
 * branches out of both webhooks, drop the `godaisy_subscription_*` columns from
 * `profiles`, drop the `godaisy_subscription_events` table, and delete this file.
 *
 * @module lib/godaisy/subscription
 */

/** Retained only for the unreachable Go Daisy branches in the shared webhooks. */
export type GoDaisyTier = 'free' | 'plus';

/** As above. `promo` was granted by a redemption endpoint that no longer exists. */
export type GoDaisySubscriptionType = 'monthly' | 'annual' | 'promo';
