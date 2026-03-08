/**
 * Go Daisy+ Subscription System
 *
 * Defines subscription tiers, limits, and helper functions for feature gating.
 *
 * Tiers:
 * - FREE: 6 outdoor activities, 3-day forecast, core safety features
 * - PLUS (€9.99/yr or €1.49/mo): Unlimited outdoor activities, 14-day forecast, all features
 *
 * Guiding principle: "Today is free. Tomorrow is Plus."
 * - Indoor activities are ALWAYS free (rainy days shouldn't feel punishing)
 * - Safety features (UV, AQI, extreme weather) are ALWAYS free
 *
 * @module lib/godaisy/subscription
 */

// =============================================================================
// TYPES
// =============================================================================

export type GoDaisyTier = 'free' | 'plus';
export type GoDaisySubscriptionType = 'monthly' | 'annual' | 'promo';

export interface GoDaisyTierLimits {
  maxOutdoorActivities: number;       // 6 (free) | -1 unlimited (plus)
  indoorActivitiesUnlimited: boolean; // always true
  forecastDays: number;               // 3 (free) | 14 (plus)
  coastalLocation: boolean;           // false (free) | true (plus)
  pushNotifications: boolean;         // false (free) | true (plus) — except extreme weather always free
  environmentalCards: boolean;        // false (free) | true (plus) — pollen, soil, pressure, visibility
  astronomyAlerts: boolean;           // false (free) | true (plus) — ISS, events
  socialFeatures: boolean;            // false (free) | true (plus) — invites, polls, venues
  plannedActivities: boolean;         // false (free) | true (plus)
  offlineMode: boolean;               // false (free) | true (plus)
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const GODAISY_TIERS: Record<GoDaisyTier, GoDaisyTierLimits> = {
  free: {
    maxOutdoorActivities: 6,
    indoorActivitiesUnlimited: true,
    forecastDays: 3,
    coastalLocation: false,
    pushNotifications: false,
    environmentalCards: false,
    astronomyAlerts: false,
    socialFeatures: false,
    plannedActivities: false,
    offlineMode: false,
  },
  plus: {
    maxOutdoorActivities: -1, // Unlimited
    indoorActivitiesUnlimited: true,
    forecastDays: 14,
    coastalLocation: true,
    pushNotifications: true,
    environmentalCards: true,
    astronomyAlerts: true,
    socialFeatures: true,
    plannedActivities: true,
    offlineMode: true,
  },
};

// =============================================================================
// PRICING
// =============================================================================

export const GODAISY_PRICING = {
  monthly: {
    amount: 1.49,
    currency: 'EUR' as const,
    stripe_price_id: process.env.STRIPE_GODAISY_PLUS_MONTHLY_PRICE_ID || 'price_godaisy_plus_monthly',
  },
  annual: {
    amount: 9.99,
    currency: 'EUR' as const,
    stripe_price_id: process.env.STRIPE_GODAISY_PLUS_ANNUAL_PRICE_ID || 'price_godaisy_plus_annual',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get limits for a specific tier.
 */
export function getTierLimits(tier: GoDaisyTier): GoDaisyTierLimits {
  return GODAISY_TIERS[tier];
}

/**
 * Check if a tier has access to a specific feature.
 */
export function hasFeatureAccess(
  tier: GoDaisyTier,
  feature: keyof GoDaisyTierLimits
): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];

  // Boolean features
  if (typeof value === 'boolean') return value;

  // Numeric features (-1 = unlimited, 0 = no access, > 0 = limited access)
  if (typeof value === 'number') return value !== 0;

  return !!value;
}

/**
 * Check if current usage exceeds the tier limit for outdoor activities.
 */
export function isOverLimit(
  tier: GoDaisyTier,
  feature: 'maxOutdoorActivities',
  currentCount: number
): boolean {
  const limit = getTierLimits(tier)[feature];
  if (limit === -1) return false; // Unlimited
  return currentCount >= limit;
}

/**
 * Get remaining usage for outdoor activities.
 */
export function getRemainingUsage(
  tier: GoDaisyTier,
  feature: 'maxOutdoorActivities',
  currentCount: number
): number {
  const limit = getTierLimits(tier)[feature];
  if (limit === -1) return Infinity;
  return Math.max(0, limit - currentCount);
}

/**
 * Shorthand: check if a tier can use a feature.
 * Combines hasFeatureAccess for boolean features and isOverLimit for numeric ones.
 */
export function canUse(
  tier: GoDaisyTier,
  feature: keyof GoDaisyTierLimits
): boolean {
  return hasFeatureAccess(tier, feature);
}

/**
 * Get the minimum tier required for a feature.
 */
export function getMinimumTierForFeature(
  feature: keyof GoDaisyTierLimits
): GoDaisyTier {
  if (hasFeatureAccess('free', feature)) return 'free';
  return 'plus';
}

/**
 * Format price for display.
 */
export function formatPrice(price: number, currency: 'EUR' = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Feature display names for upgrade prompts.
 */
export const FEATURE_DISPLAY_NAMES: Record<keyof GoDaisyTierLimits, string> = {
  maxOutdoorActivities: 'Unlimited Outdoor Activities',
  indoorActivitiesUnlimited: 'Indoor Activities',
  forecastDays: '14-Day Forecast',
  coastalLocation: 'Coastal Location',
  pushNotifications: 'Smart Notifications',
  environmentalCards: 'Environmental Data',
  astronomyAlerts: 'Astronomy Alerts',
  socialFeatures: 'Social Features',
  plannedActivities: 'Activity Journal',
  offlineMode: 'Offline Mode',
};

/**
 * Context-aware upgrade headline for each feature.
 */
export const UPGRADE_HEADLINES: Record<string, string> = {
  forecast: 'Unlock 14-day forecasts',
  activities: 'Track unlimited outdoor activities',
  environmental: 'Unlock pollen, soil & more',
  coastal: 'Add a coastal location',
  notifications: 'Get smart notifications',
  social: 'Plan activities with friends',
  astronomy: 'Never miss a celestial event',
  planned: 'Plan and journal your activities',
  offline: 'Use Go Daisy offline',
};
