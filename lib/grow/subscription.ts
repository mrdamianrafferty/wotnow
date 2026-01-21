/**
 * Grow Daisy Subscription System
 *
 * Defines subscription tiers, limits, and helper functions for feature gating.
 *
 * Tiers:
 * - SEED (free): 25 plants, 5 AI IDs/month, basic features
 * - SPROUT (€3.99/mo): 75 plants, 20 AI IDs/month, extended features
 * - BLOOM (€6.99/mo): Unlimited plants, weather moats (soil temp, frost alerts)
 * - HARVEST (€11.99/mo): Professional features, yield tracking, AI expert
 * - ORCHARD (€199/yr): Business features, white-label, API access
 *
 * @module lib/grow/subscription
 */

// =============================================================================
// TYPES
// =============================================================================

export type GrowSubscriptionTier = 'seed' | 'sprout' | 'bloom' | 'harvest' | 'orchard';
export type GrowSubscriptionType = 'monthly' | 'annual' | 'lifetime';

export interface GrowTierLimits {
  // Plant tracking
  maxPlants: number;          // -1 = unlimited
  maxBeds: number;            // -1 = unlimited
  maxGardens: number;         // -1 = unlimited

  // AI usage (per month)
  plantIdCalls: number;       // -1 = unlimited
  pestDiseaseCalls: number;   // -1 = unlimited
  expertQuestionCalls: number; // 0 = not available

  // Photo storage
  maxPhotos: number;          // -1 = unlimited

  // Weather features
  forecastDays: number;       // 3, 7, or 14 days
  soilTemperature: boolean;
  frostAlerts: boolean;
  weatherThreats: boolean;
  windAwareness: boolean;
  smartWatering: boolean;

  // Hardware integrations (weather stations, irrigation controllers)
  hardwareIntegrations: boolean;

  // Companion planting (FREE for all tiers)
  // guildAccess removed - guilds are now free for everyone

  // Data retention
  taskHistoryMonths: number;  // -1 = unlimited
  harvestHistoryYears: number; // 0 = not available

  // Advanced features
  exportData: boolean;
  cropRotation: boolean;
  yieldPredictions: boolean;
  analyticsAccess: boolean;
  teamMembers: number;        // 0 = not available
  apiAccess: boolean;
  offlineMode: boolean;
}

export interface GrowTierPricing {
  monthly: number | null;     // null = not available
  annual: number | null;
  lifetime: number | null;
  currency: 'EUR';
}

export interface GrowTierInfo {
  id: GrowSubscriptionTier;
  name: string;
  tagline: string;
  limits: GrowTierLimits;
  pricing: GrowTierPricing;
  recommended?: boolean;
  stripePriceIds?: {
    monthly?: string;
    annual?: string;
    lifetime?: string;
  };
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const GROW_TIERS: Record<GrowSubscriptionTier, GrowTierInfo> = {
  seed: {
    id: 'seed',
    name: 'Seed',
    tagline: 'Free Forever',
    limits: {
      maxPlants: 25,
      maxBeds: 2,
      maxGardens: 1,
      plantIdCalls: 5,
      pestDiseaseCalls: 2,
      expertQuestionCalls: 0,
      maxPhotos: 100,
      forecastDays: 3,
      soilTemperature: false,
      frostAlerts: false,
      weatherThreats: false,
      windAwareness: false,
      smartWatering: false,
      hardwareIntegrations: false,
      taskHistoryMonths: 1,
      harvestHistoryYears: 0,
      exportData: false,
      cropRotation: false,
      yieldPredictions: false,
      analyticsAccess: false,
      teamMembers: 0,
      apiAccess: false,
      offlineMode: false,
    },
    pricing: {
      monthly: null,
      annual: null,
      lifetime: null,
      currency: 'EUR',
    },
  },

  sprout: {
    id: 'sprout',
    name: 'Sprout',
    tagline: 'The Organized Gardener',
    limits: {
      maxPlants: 75,
      maxBeds: 5,
      maxGardens: 1,
      plantIdCalls: 20,
      pestDiseaseCalls: 10,
      expertQuestionCalls: 0,
      maxPhotos: -1,  // Unlimited
      forecastDays: 7,
      soilTemperature: false,
      frostAlerts: false,
      weatherThreats: false,
      windAwareness: false,
      smartWatering: false,
      hardwareIntegrations: true,
      taskHistoryMonths: 6,
      harvestHistoryYears: 0,
      exportData: true,
      cropRotation: false,
      yieldPredictions: false,
      analyticsAccess: false,
      teamMembers: 0,
      apiAccess: false,
      offlineMode: false,
    },
    pricing: {
      monthly: 3.99,
      annual: 29.99,
      lifetime: 59.99,
      currency: 'EUR',
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_GROW_SPROUT_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_GROW_SPROUT_ANNUAL_PRICE_ID,
      lifetime: process.env.STRIPE_GROW_SPROUT_LIFETIME_PRICE_ID,
    },
  },

  bloom: {
    id: 'bloom',
    name: 'Bloom',
    tagline: 'The Weather-Smart Gardener',
    recommended: true,
    limits: {
      maxPlants: -1,  // Unlimited
      maxBeds: 10,
      maxGardens: 3,
      plantIdCalls: -1,  // Unlimited
      pestDiseaseCalls: 30,
      expertQuestionCalls: 0,
      maxPhotos: -1,  // Unlimited
      forecastDays: 14,
      soilTemperature: true,   // THE MOAT
      frostAlerts: true,       // THE MOAT
      weatherThreats: true,    // THE MOAT
      windAwareness: true,     // THE MOAT
      smartWatering: true,     // THE MOAT
      hardwareIntegrations: true,
      taskHistoryMonths: 12,
      harvestHistoryYears: 1,
      exportData: true,
      cropRotation: true,
      yieldPredictions: false,
      analyticsAccess: false,
      teamMembers: 0,
      apiAccess: false,
      offlineMode: true,
    },
    pricing: {
      monthly: 6.99,
      annual: 49.99,
      lifetime: 99.99,
      currency: 'EUR',
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_GROW_BLOOM_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_GROW_BLOOM_ANNUAL_PRICE_ID,
      lifetime: process.env.STRIPE_GROW_BLOOM_LIFETIME_PRICE_ID,
    },
  },

  harvest: {
    id: 'harvest',
    name: 'Harvest',
    tagline: 'The Productive Gardener',
    limits: {
      maxPlants: -1,
      maxBeds: -1,
      maxGardens: -1,
      plantIdCalls: -1,
      pestDiseaseCalls: -1,
      expertQuestionCalls: 2,  // AI expert access
      maxPhotos: -1,
      forecastDays: 14,
      soilTemperature: true,
      frostAlerts: true,
      weatherThreats: true,
      windAwareness: true,
      smartWatering: true,
      hardwareIntegrations: true,
      taskHistoryMonths: -1,  // Unlimited
      harvestHistoryYears: 5,
      exportData: true,
      cropRotation: true,
      yieldPredictions: true,
      analyticsAccess: true,
      teamMembers: 5,
      apiAccess: false,
      offlineMode: true,
    },
    pricing: {
      monthly: 11.99,
      annual: 79.99,
      lifetime: 149.99,
      currency: 'EUR',
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_GROW_HARVEST_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_GROW_HARVEST_ANNUAL_PRICE_ID,
      lifetime: process.env.STRIPE_GROW_HARVEST_LIFETIME_PRICE_ID,
    },
  },

  orchard: {
    id: 'orchard',
    name: 'Orchard',
    tagline: 'The Professional',
    limits: {
      maxPlants: -1,
      maxBeds: -1,
      maxGardens: -1,
      plantIdCalls: -1,
      pestDiseaseCalls: -1,
      expertQuestionCalls: 10,
      maxPhotos: -1,
      forecastDays: 14,
      soilTemperature: true,
      frostAlerts: true,
      weatherThreats: true,
      windAwareness: true,
      smartWatering: true,
      hardwareIntegrations: true,
      taskHistoryMonths: -1,
      harvestHistoryYears: -1,  // Unlimited
      exportData: true,
      cropRotation: true,
      yieldPredictions: true,
      analyticsAccess: true,
      teamMembers: -1,  // Unlimited
      apiAccess: true,
      offlineMode: true,
    },
    pricing: {
      monthly: null,  // Annual only
      annual: 199,
      lifetime: 399,
      currency: 'EUR',
    },
    stripePriceIds: {
      annual: process.env.STRIPE_GROW_ORCHARD_ANNUAL_PRICE_ID,
      lifetime: process.env.STRIPE_GROW_ORCHARD_LIFETIME_PRICE_ID,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tier info by tier ID
 */
export function getTierInfo(tier: GrowSubscriptionTier): GrowTierInfo {
  return GROW_TIERS[tier];
}

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: GrowSubscriptionTier): GrowTierLimits {
  return GROW_TIERS[tier].limits;
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeatureAccess(
  tier: GrowSubscriptionTier,
  feature: keyof GrowTierLimits
): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];

  // Boolean features
  if (typeof value === 'boolean') return value;

  // Numeric features (-1 = unlimited, 0 = no access, > 0 = limited)
  if (typeof value === 'number') return value !== 0;

  // String features (e.g., 'basic' | 'full')
  return !!value;
}

/**
 * Get the limit value for a specific feature
 */
export function getFeatureLimit(
  tier: GrowSubscriptionTier,
  feature: keyof GrowTierLimits
): number | boolean | string {
  return getTierLimits(tier)[feature];
}

/**
 * Check if current usage exceeds the tier limit
 */
export function isOverLimit(
  tier: GrowSubscriptionTier,
  feature: 'maxPlants' | 'maxBeds' | 'maxGardens' | 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls' | 'maxPhotos',
  currentUsage: number
): boolean {
  const limit = getTierLimits(tier)[feature];
  if (limit === -1) return false;  // Unlimited
  return currentUsage >= limit;
}

/**
 * Get remaining usage for a feature
 */
export function getRemainingUsage(
  tier: GrowSubscriptionTier,
  feature: 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls',
  currentUsage: number
): number {
  const limit = getTierLimits(tier)[feature];
  if (limit === -1) return Infinity;
  return Math.max(0, limit - currentUsage);
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(
  feature: keyof GrowTierLimits
): GrowSubscriptionTier {
  const tiers: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];

  for (const tier of tiers) {
    if (hasFeatureAccess(tier, feature)) {
      return tier;
    }
  }

  return 'orchard';  // Fallback to highest tier
}

/**
 * Get upgrade tier options from current tier
 */
export function getUpgradeOptions(currentTier: GrowSubscriptionTier): GrowTierInfo[] {
  const tierOrder: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];
  const currentIndex = tierOrder.indexOf(currentTier);

  return tierOrder
    .slice(currentIndex + 1)
    .map(tier => GROW_TIERS[tier]);
}

/**
 * Compare two tiers (returns -1, 0, or 1)
 */
export function compareTiers(a: GrowSubscriptionTier, b: GrowSubscriptionTier): number {
  const tierOrder: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];
  return tierOrder.indexOf(a) - tierOrder.indexOf(b);
}

/**
 * Check if tier A is higher than tier B
 */
export function isTierHigher(a: GrowSubscriptionTier, b: GrowSubscriptionTier): boolean {
  return compareTiers(a, b) > 0;
}

/**
 * Check if tier A is at least tier B
 */
export function isTierAtLeast(current: GrowSubscriptionTier, required: GrowSubscriptionTier): boolean {
  return compareTiers(current, required) >= 0;
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null, currency: 'EUR' = 'EUR'): string {
  if (price === null) return 'N/A';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Get display name for a tier
 */
export function getTierDisplayName(tier: GrowSubscriptionTier): string {
  return GROW_TIERS[tier].name;
}

/**
 * Get all paid tiers (excludes seed)
 */
export function getPaidTiers(): GrowTierInfo[] {
  return Object.values(GROW_TIERS).filter(tier => tier.id !== 'seed');
}

/**
 * Feature names for display
 */
export const FEATURE_DISPLAY_NAMES: Partial<Record<keyof GrowTierLimits, string>> = {
  maxPlants: 'Plant Tracking',
  maxBeds: 'Garden Beds',
  maxGardens: 'Multiple Gardens',
  plantIdCalls: 'AI Plant ID',
  pestDiseaseCalls: 'Pest & Disease Diagnosis',
  expertQuestionCalls: 'Ask the Expert',
  maxPhotos: 'Photo Storage',
  forecastDays: 'Weather Forecast',
  soilTemperature: 'Soil Temperature (4 depths)',
  frostAlerts: '48-Hour Frost Alerts',
  weatherThreats: 'Weather Threat Engine',
  windAwareness: 'Wind-Aware Gardening',
  smartWatering: 'Smart Watering',
  hardwareIntegrations: 'Hardware Integrations',
  exportData: 'Export Garden Data',
  cropRotation: 'Crop Rotation Planner',
  yieldPredictions: 'Yield Predictions',
  analyticsAccess: 'Analytics Dashboard',
  teamMembers: 'Team Sharing',
  apiAccess: 'API Access',
  offlineMode: 'Offline Mode',
};
