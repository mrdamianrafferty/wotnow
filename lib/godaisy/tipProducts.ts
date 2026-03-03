/**
 * Go Daisy Tip Products — Consumable IAP for iOS tips
 *
 * These are one-time consumable products used on the /support page
 * to replace the Patreon deep-link tip buttons that were rejected
 * under App Store Guideline 3.1.1.
 *
 * Shared across Go Daisy and Findr (same RevenueCat account).
 *
 * @module lib/godaisy/tipProducts
 */

export interface GoDaisyTipProduct {
  /** RevenueCat / App Store Connect product identifier */
  id: string;
  /** User-facing label */
  label: string;
  /** Emoji displayed next to the label */
  emoji: string;
  /** Default price in EUR (actual price comes from RevenueCat / StoreKit) */
  defaultPriceEur: number;
}

export const GODAISY_TIP_PRODUCTS: GoDaisyTipProduct[] = [
  { id: 'godaisy_tip_coffee', label: 'Coffee', emoji: '\u2615', defaultPriceEur: 2 },
  { id: 'godaisy_tip_pint', label: 'Pint', emoji: '\uD83C\uDF7A', defaultPriceEur: 5 },
  { id: 'godaisy_tip_boost', label: 'Daisy Boost', emoji: '\uD83C\uDF3C', defaultPriceEur: 10 },
];

/**
 * Check if a product ID is a Go Daisy tip (not a subscription).
 * Used in webhook handler to skip profile tier updates for tips.
 */
export function isGoDaisyTip(productId: string): boolean {
  return GODAISY_TIP_PRODUCTS.some((p) => p.id === productId);
}
