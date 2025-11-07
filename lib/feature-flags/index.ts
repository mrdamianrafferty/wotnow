/**
 * Feature Flags System
 *
 * Remote feature toggles for A/B testing and gradual rollouts.
 * Works with or without a backend API.
 *
 * Features:
 * - Local defaults (works offline)
 * - Remote configuration (optional)
 * - Type-safe flag names
 * - Caching (reduces API calls)
 * - Percentage rollouts
 *
 * Setup:
 * 1. Define flags in DEFAULT_FLAGS below
 * 2. Optionally create API endpoint at /api/feature-flags
 * 3. Set NEXT_PUBLIC_FEATURE_FLAGS_API in .env.local (optional)
 *
 * Usage:
 *   import { useFeatureFlag, isFeatureEnabled } from '@/lib/feature-flags';
 *
 *   // In React component
 *   const { enabled, loading } = useFeatureFlag('new_ui');
 *   if (enabled) {
 *     return <NewUI />;
 *   }
 *
 *   // In non-React code
 *   if (await isFeatureEnabled('experimental_feature')) {
 *     // Do something
 *   }
 */

import { useState, useEffect } from 'react';

/**
 * Feature flag names (type-safe)
 */
export type FeatureFlag =
  // UI Features
  | 'new_prediction_ui'
  | 'advanced_filters'
  | 'dark_mode'
  | 'compact_view'

  // Data Features
  | 'real_time_conditions'
  | 'historical_data'
  | 'tide_integration'
  | 'weather_alerts'

  // Social Features
  | 'catch_sharing'
  | 'leaderboards'
  | 'community_spots'
  | 'catch_verification'

  // Experimental
  | 'ai_recommendations'
  | 'voice_assistant'
  | 'ar_view'

  // Admin/Debug
  | 'debug_mode'
  | 'performance_monitoring'
  | 'detailed_logs';

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Percentage of users to enable for (0-100) */
  rolloutPercentage?: number;
  /** Description of the feature */
  description?: string;
  /** Minimum app version required */
  minVersion?: string;
}

/**
 * Default flag values (local fallback)
 */
const DEFAULT_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  // UI Features (generally available)
  new_prediction_ui: { enabled: false, description: 'Redesigned prediction cards' },
  advanced_filters: { enabled: true, description: 'Advanced species filtering' },
  dark_mode: { enabled: true, description: 'Dark theme support' },
  compact_view: { enabled: true, description: 'Compact list view option' },

  // Data Features (mostly enabled)
  real_time_conditions: { enabled: true, description: 'Real-time CMEMS data' },
  historical_data: { enabled: false, description: 'Historical catch data', rolloutPercentage: 50 },
  tide_integration: { enabled: true, description: 'Tide predictions in UI' },
  weather_alerts: { enabled: true, description: 'Weather alert notifications' },

  // Social Features (coming soon)
  catch_sharing: { enabled: true, description: 'Share catches with friends' },
  leaderboards: { enabled: false, description: 'Community leaderboards' },
  community_spots: { enabled: false, description: 'User-submitted fishing spots' },
  catch_verification: { enabled: false, description: 'Verified catch badges' },

  // Experimental (disabled by default)
  ai_recommendations: { enabled: false, description: 'AI-powered spot recommendations' },
  voice_assistant: { enabled: false, description: 'Voice-activated catch logging' },
  ar_view: { enabled: false, description: 'Augmented reality species viewer' },

  // Admin/Debug (disabled in production)
  debug_mode: { enabled: process.env.NODE_ENV !== 'production', description: 'Debug panel' },
  performance_monitoring: { enabled: true, description: 'Performance metrics collection' },
  detailed_logs: { enabled: process.env.NODE_ENV !== 'production', description: 'Verbose logging' },
};

/**
 * Cache for remote flags
 */
let remoteFlags: Record<string, FeatureFlagConfig> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get user ID for consistent rollout percentage
 * Uses device ID or generates a stable ID
 */
async function getUserRolloutId(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server';
  }

  // Try to get from localStorage
  let userId = localStorage.getItem('feature_flag_user_id');
  if (userId) {
    return userId;
  }

  // Try to get device ID (Capacitor)
  try {
    const { Device } = await import('@capacitor/device');
    const deviceInfo = await Device.getId();
    userId = deviceInfo.identifier;
  } catch {
    // Generate random ID if Capacitor not available
    userId = Math.random().toString(36).substring(2, 15);
  }

  localStorage.setItem('feature_flag_user_id', userId);
  return userId;
}

/**
 * Check if user is in rollout percentage
 */
async function isInRollout(percentage: number): Promise<boolean> {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const userId = await getUserRolloutId();
  // Hash user ID to get consistent percentage
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const userPercentage = Math.abs(hash % 100);
  return userPercentage < percentage;
}

/**
 * Fetch remote flags from API
 */
async function fetchRemoteFlags(): Promise<Record<string, FeatureFlagConfig>> {
  // Check cache
  const now = Date.now();
  if (remoteFlags && (now - lastFetchTime) < CACHE_TTL_MS) {
    return remoteFlags;
  }

  // No API configured - use defaults
  if (!process.env.NEXT_PUBLIC_FEATURE_FLAGS_API) {
    return DEFAULT_FLAGS;
  }

  try {
    const response = await fetch(process.env.NEXT_PUBLIC_FEATURE_FLAGS_API, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch flags: ${response.status}`);
    }

    const data = await response.json();
    remoteFlags = { ...DEFAULT_FLAGS, ...data.flags };
    lastFetchTime = now;

    console.log('[FeatureFlags] Remote flags fetched:', Object.keys(remoteFlags).length);
    return remoteFlags;
  } catch (error) {
    console.warn('[FeatureFlags] Failed to fetch remote flags, using defaults:', error);
    return DEFAULT_FLAGS;
  }
}

/**
 * Check if a feature is enabled
 *
 * @param flagName - Feature flag name
 * @returns Whether the feature is enabled for this user
 *
 * @example
 * if (await isFeatureEnabled('new_ui')) {
 *   return <NewUI />;
 * }
 */
export async function isFeatureEnabled(flagName: FeatureFlag): Promise<boolean> {
  try {
    const flags = await fetchRemoteFlags();
    const config = flags[flagName];

    if (!config) {
      console.warn(`[FeatureFlags] Unknown flag: ${flagName}`);
      return false;
    }

    // Check if enabled
    if (!config.enabled) {
      return false;
    }

    // Check rollout percentage
    if (config.rolloutPercentage !== undefined) {
      return await isInRollout(config.rolloutPercentage);
    }

    return true;
  } catch (error) {
    console.error(`[FeatureFlags] Error checking flag ${flagName}:`, error);
    // Fallback to default
    return DEFAULT_FLAGS[flagName]?.enabled || false;
  }
}

/**
 * Get feature flag configuration
 */
export async function getFeatureFlagConfig(flagName: FeatureFlag): Promise<FeatureFlagConfig> {
  const flags = await fetchRemoteFlags();
  return flags[flagName] || DEFAULT_FLAGS[flagName];
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<Record<FeatureFlag, FeatureFlagConfig>> {
  return await fetchRemoteFlags() as Record<FeatureFlag, FeatureFlagConfig>;
}

/**
 * React hook for feature flags
 *
 * @param flagName - Feature flag name
 * @returns Object with enabled status and loading state
 *
 * @example
 * function MyComponent() {
 *   const { enabled, loading } = useFeatureFlag('new_ui');
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!enabled) return null;
 *
 *   return <NewFeature />;
 * }
 */
export function useFeatureFlag(flagName: FeatureFlag): {
  enabled: boolean;
  loading: boolean;
  config: FeatureFlagConfig | null;
} {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FeatureFlagConfig | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkFlag() {
      try {
        const flagConfig = await getFeatureFlagConfig(flagName);
        const isEnabled = await isFeatureEnabled(flagName);

        if (mounted) {
          setConfig(flagConfig);
          setEnabled(isEnabled);
          setLoading(false);
        }
      } catch (error) {
        console.error(`[FeatureFlags] Error in useFeatureFlag(${flagName}):`, error);
        if (mounted) {
          setEnabled(false);
          setLoading(false);
        }
      }
    }

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flagName]);

  return { enabled, loading, config };
}

/**
 * Override a feature flag (for testing/debugging)
 * Only works in development
 */
export function overrideFeatureFlag(flagName: FeatureFlag, enabled: boolean): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[FeatureFlags] Override only available in development');
    return;
  }

  if (typeof window === 'undefined') return;

  const overrides = JSON.parse(localStorage.getItem('feature_flag_overrides') || '{}');
  overrides[flagName] = enabled;
  localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));

  console.log(`[FeatureFlags] Override ${flagName} = ${enabled}`);
}

/**
 * Clear all feature flag overrides
 */
export function clearFeatureFlagOverrides(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('feature_flag_overrides');
  console.log('[FeatureFlags] Overrides cleared');
}
