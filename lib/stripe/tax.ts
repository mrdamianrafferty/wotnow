/**
 * Stripe Tax configuration
 *
 * Go Daisy+ and Grow Daisy sell EUR-denominated digital subscriptions from a
 * Spain-registered business to consumers across the EU, which brings VAT/OSS
 * obligations. Until 2026-08-23 no Checkout session set any tax parameters at
 * all, so every sale was made with no VAT handling whatsoever.
 *
 * ── Why this is behind a flag ────────────────────────────────────────────
 * `automatic_tax: { enabled: true }` requires Stripe Tax to be ACTIVATED in
 * the dashboard first (origin address set, tax registrations added). Sending
 * it before that is not a no-op — `checkout.sessions.create` throws, which
 * takes down checkout for every user. So this ships off by default and is
 * turned on deliberately, per environment, once the dashboard side is ready:
 *
 *   1. Stripe Dashboard → Tax → activate, set origin address, add the Spanish
 *      registration and any other member states you're registered in (or the
 *      OSS registration, if you're using the One-Stop Shop).
 *   2. Confirm each Price's `tax_behavior` is set (inclusive or exclusive) —
 *      prices with `tax_behavior: unspecified` are rejected by automatic tax.
 *   3. Then set STRIPE_AUTOMATIC_TAX_ENABLED=true and redeploy.
 *
 * Verify in a sandbox before production: a misconfigured registration set
 * charges the wrong rate rather than failing loudly.
 *
 * @module lib/stripe/tax
 */

import type Stripe from 'stripe';

/**
 * Whether to send tax parameters on new Checkout sessions.
 *
 * Deliberately opt-in. See the module comment — turning this on without the
 * dashboard configuration in place breaks checkout rather than degrading it.
 */
export const STRIPE_AUTOMATIC_TAX_ENABLED =
  process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true';

/**
 * Tax parameters for a Checkout session.
 *
 * Returns an empty object when the flag is off, so callers can spread this
 * unconditionally and the session params are byte-for-byte what they were
 * before this existed.
 *
 * `customer_update.address` is not optional when a session both passes an
 * existing `customer` and enables automatic tax: Stripe needs permission to
 * write the address it collects back to the customer, and errors without it.
 * Both of our checkout endpoints always pass a customer, so it's always set
 * here — but the parameter is still keyed off `hasCustomer` so this stays
 * correct if a future caller creates the customer inside Checkout instead.
 *
 * `tax_id_collection` lets EU business buyers enter a VAT number, which is
 * what makes the B2B reverse charge work. Harmless for consumers — it renders
 * as an optional field.
 */
export function checkoutTaxParams(
  hasCustomer: boolean
): Partial<Stripe.Checkout.SessionCreateParams> {
  if (!STRIPE_AUTOMATIC_TAX_ENABLED) return {};

  return {
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    ...(hasCustomer
      ? { customer_update: { address: 'auto' as const, name: 'auto' as const } }
      : {}),
  };
}
