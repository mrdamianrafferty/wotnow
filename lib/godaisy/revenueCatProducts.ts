/**
 * RevenueCat Product ID → Go Daisy+ Tier Mapping
 *
 * Maps App Store product IDs (configured in RevenueCat) to internal
 * subscription tier and type. Used by the server-side webhook handler.
 *
 * @module lib/godaisy/revenueCatProducts
 */

import type { GoDaisyTier, GoDaisySubscriptionType } from './subscription';

export interface GoDaisyRevenueCatProductMapping {
  tier: GoDaisyTier;
  type: Exclude<GoDaisySubscriptionType, 'promo'>;
}

/**
 * Static map from RevenueCat/App Store product IDs to Go Daisy+ tier + billing type.
 * Product IDs are placeholder — update when App Store Connect products are created.
 */
export const GODAISY_REVENUECAT_PRODUCT_MAP: Record<string, GoDaisyRevenueCatProductMapping> = {
  godaisy_plus_monthly: { tier: 'plus', type: 'monthly' },
  godaisy_plus_annual:  { tier: 'plus', type: 'annual'  },
};

/**
 * Check if a RevenueCat product ID belongs to Go Daisy+.
 */
export function isGoDaisyPlusProduct(productId: string): boolean {
  return productId in GODAISY_REVENUECAT_PRODUCT_MAP;
}

/**
 * Map a RevenueCat product ID to the corresponding Go Daisy+ tier and billing type.
 * Returns null if the product ID is not a Go Daisy+ product.
 */
export function mapGoDaisyProductToTier(productId: string): GoDaisyRevenueCatProductMapping | null {
  return GODAISY_REVENUECAT_PRODUCT_MAP[productId] ?? null;
}
