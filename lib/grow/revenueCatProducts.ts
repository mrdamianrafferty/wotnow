/**
 * RevenueCat Product ID → Grow Daisy Tier Mapping
 *
 * Maps App Store product IDs (configured in RevenueCat) to internal
 * subscription tier and type. Used by both the client-side purchase flow
 * and the server-side webhook handler.
 *
 * @module lib/grow/revenueCatProducts
 */

import type { GrowSubscriptionTier, GrowSubscriptionType } from './subscription';

export interface RevenueCatProductMapping {
  tier: GrowSubscriptionTier;
  type: GrowSubscriptionType;
}

/**
 * Static map from RevenueCat/App Store product IDs to Grow tier + billing type.
 *
 * ── Platform split, decided 2026-08-23 ──────────────────────────────────
 * iOS sells SUBSCRIPTIONS ONLY, and only Sprout and Bloom:
 *
 *     growdaisy_{sprout,bloom}_{monthly,annual}   <- live on the App Store
 *
 * Everything else — all three Harvest products, both Orchard products, and
 * every lifetime — is WEB ONLY, sold through Stripe. Those seven products
 * are archived in RevenueCat and do not exist in App Store Connect.
 *
 * Why: Apple takes 15-30%, Stripe ~2.9%. On a EUR 199 Orchard annual that is
 * EUR 30-60 a sale, and on a one-off lifetime there is no renewal stream to
 * earn the fee back. The premium page hides the Harvest card on iOS
 * (pages/grow/premium.tsx) and the billing-cycle toggle already drops any
 * cycle with no RevenueCat packages, so `lifetime` disappears there too.
 *
 * Entitlement is NOT split. A web purchase grants the tier inside the iOS
 * app: RevenueCat's app_user_id is the Supabase UUID, both webhooks write
 * the same `grow_subscription_tier` on the same profiles row, and the iOS
 * app loads the web layer remotely (capacitor.config.growdaisy.ts).
 *
 * The archived identifiers stay mapped below ON PURPOSE. Archiving hides a
 * product from new purchases; it does not cancel existing ones, and Apple
 * keeps sending events for anything already bought. Deleting these entries
 * would make those events resolve to null. Do not prune them.
 *
 * If you ever DO want one of these on iOS, note that Apple permanently
 * reserves product identifiers: creating `growdaisy_harvest_monthly` fails
 * with "This product ID has already been used", so it would need a new
 * identifier and a matching entry here.
 */
export const REVENUECAT_PRODUCT_MAP: Record<string, RevenueCatProductMapping> = {
  // Sprout
  growdaisy_sprout_monthly:  { tier: 'sprout',  type: 'monthly'  },
  growdaisy_sprout_annual:   { tier: 'sprout',  type: 'annual'   },
  growdaisy_sprout_lifetime: { tier: 'sprout',  type: 'lifetime' },

  // Bloom
  growdaisy_bloom_monthly:   { tier: 'bloom',   type: 'monthly'  },
  growdaisy_bloom_annual:    { tier: 'bloom',   type: 'annual'   },
  growdaisy_bloom_lifetime:  { tier: 'bloom',   type: 'lifetime' },

  // Harvest
  growdaisy_harvest_monthly: { tier: 'harvest', type: 'monthly'  },
  growdaisy_harvest_annual:  { tier: 'harvest', type: 'annual'   },
  growdaisy_harvest_lifetime:{ tier: 'harvest', type: 'lifetime' },

  // Orchard (annual + lifetime only)
  growdaisy_orchard_annual:  { tier: 'orchard', type: 'annual'   },
  growdaisy_orchard_lifetime:{ tier: 'orchard', type: 'lifetime' },
};

/**
 * Map a RevenueCat product ID to the corresponding Grow tier and billing type.
 * Returns null if the product ID is not recognized.
 */
export function mapProductToTier(productId: string): RevenueCatProductMapping | null {
  return REVENUECAT_PRODUCT_MAP[productId] ?? null;
}
