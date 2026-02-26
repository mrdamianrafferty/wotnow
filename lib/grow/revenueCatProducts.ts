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
