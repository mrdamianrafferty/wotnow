/**
 * Grow Premium Gate Component
 *
 * Renders children only if user has required subscription tier.
 * Shows upgrade prompt when access is denied.
 *
 * @module components/grow/premium/GrowPremiumGate
 */

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, Thermometer, AlertTriangle, Wind, Droplets, Leaf, ChartBar, Users } from 'lucide-react';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import {
  GrowSubscriptionTier,
  GrowTierLimits,
  getTierDisplayName,
  getMinimumTierForFeature,
  FEATURE_DISPLAY_NAMES,
} from '@/lib/grow/subscription';

// =============================================================================
// TYPES
// =============================================================================

type FeatureKey = keyof GrowTierLimits;

interface GrowPremiumGateProps {
  /**
   * The feature to gate access to
   */
  feature: FeatureKey;

  /**
   * Alternative: require a specific minimum tier
   */
  requireTier?: GrowSubscriptionTier;

  /**
   * Content to render when user has access
   */
  children: React.ReactNode;

  /**
   * Custom fallback when access denied (overrides default upgrade prompt)
   */
  fallback?: React.ReactNode;

  /**
   * Show a teaser/preview instead of completely hiding content
   * Useful for features where you want to show blurred or partial content
   */
  showTeaser?: boolean;

  /**
   * Teaser content to show when access is denied (if showTeaser is true)
   */
  teaserContent?: React.ReactNode;

  /**
   * Compact mode - smaller upgrade prompt
   */
  compact?: boolean;

  /**
   * Hide the gate entirely (just don't render anything) instead of showing upgrade prompt
   */
  hideWhenLocked?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GrowPremiumGate({
  feature,
  requireTier,
  children,
  fallback,
  showTeaser = false,
  teaserContent,
  compact = false,
  hideWhenLocked = false,
}: GrowPremiumGateProps) {
  const { tier, canUse, isLoading } = useGrowSubscription();

  // Determine if user has access
  const hasAccess = requireTier
    ? compareTiers(tier, requireTier) >= 0
    : canUse(feature);

  // Loading state - render children to avoid layout shift, but could also show skeleton
  if (isLoading) {
    return <>{children}</>;
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (hideWhenLocked) {
    return null;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Teaser mode - show blurred content with upgrade overlay
  if (showTeaser && teaserContent) {
    return (
      <TeaserGate
        feature={feature}
        requireTier={requireTier}
        compact={compact}
      >
        {teaserContent}
      </TeaserGate>
    );
  }

  // Default upgrade prompt
  return (
    <UpgradeGatePrompt
      feature={feature}
      requireTier={requireTier}
      compact={compact}
    />
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface UpgradeGatePromptProps {
  feature: FeatureKey;
  requireTier?: GrowSubscriptionTier;
  compact?: boolean;
}

function UpgradeGatePrompt({ feature, requireTier, compact }: UpgradeGatePromptProps) {
  const requiredTier = requireTier || getMinimumTierForFeature(feature);
  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  const tierName = getTierDisplayName(requiredTier);

  const FeatureIcon = getFeatureIcon(feature);

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
        <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-800">
          <span className="font-medium">{featureName}</span> requires{' '}
          <Link href="/grow/premium" className="text-emerald-600 font-semibold hover:underline">
            {tierName}
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 border-2 border-emerald-200 rounded-xl text-center space-y-4">
      {/* Icon */}
      <div className="p-3 bg-emerald-100 rounded-full">
        <FeatureIcon className="h-8 w-8 text-emerald-600" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-emerald-900 flex items-center gap-2 justify-center">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Premium Feature
        </h3>
        <p className="text-sm text-emerald-700 mt-1">
          {featureName} is available with <span className="font-semibold">{tierName}</span>
        </p>
      </div>

      {/* Benefits hint */}
      <p className="text-xs text-emerald-600 max-w-sm">
        {getFeatureBenefit(feature)}
      </p>

      {/* CTA Button */}
      <Link
        href="/grow/premium"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade to {tierName}
      </Link>
    </div>
  );
}

interface TeaserGateProps {
  feature: FeatureKey;
  requireTier?: GrowSubscriptionTier;
  compact?: boolean;
  children: React.ReactNode;
}

function TeaserGate({ feature, requireTier, compact, children }: TeaserGateProps) {
  const requiredTier = requireTier || getMinimumTierForFeature(feature);
  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  const tierName = getTierDisplayName(requiredTier);

  return (
    <div className="relative">
      {/* Blurred teaser content */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
        <div className={`text-center ${compact ? 'p-3' : 'p-6'} max-w-xs`}>
          <div className="p-2 bg-emerald-100 rounded-full inline-block mb-2">
            <Lock className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-emerald-900">
            {featureName}
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Unlock with{' '}
            <Link href="/grow/premium" className="text-emerald-600 font-semibold hover:underline">
              {tierName}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function compareTiers(a: GrowSubscriptionTier, b: GrowSubscriptionTier): number {
  const tierOrder: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];
  return tierOrder.indexOf(a) - tierOrder.indexOf(b);
}

function getFeatureIcon(feature: FeatureKey): React.ComponentType<{ className?: string }> {
  const iconMap: Partial<Record<FeatureKey, React.ComponentType<{ className?: string }>>> = {
    soilTemperature: Thermometer,
    frostAlerts: AlertTriangle,
    weatherThreats: AlertTriangle,
    windAwareness: Wind,
    smartWatering: Droplets,
    guildAccess: Leaf,
    analyticsAccess: ChartBar,
    teamMembers: Users,
  };
  return iconMap[feature] || Lock;
}

function getFeatureBenefit(feature: FeatureKey): string {
  const benefitMap: Partial<Record<FeatureKey, string>> = {
    soilTemperature: 'Know exactly when soil is warm enough for planting - seeds read soil temp, not air temp!',
    frostAlerts: 'Get 48-hour advance warnings to protect your tender plants before frost damage.',
    weatherThreats: 'Receive alerts when weather conditions favor pests and diseases affecting your plants.',
    windAwareness: 'Know when to skip spraying, adjust watering, or protect young seedlings from wind.',
    smartWatering: 'Save water and time with recommendations based on soil moisture, rain forecast, and evaporation.',
    guildAccess: 'Access all 84 permaculture companion planting guilds to maximize your garden productivity.',
    analyticsAccess: 'Track your garden performance with charts, trends, and insights over time.',
    teamMembers: 'Share your garden with family members and collaborate on tasks together.',
    yieldPredictions: 'Get AI-powered harvest predictions based on your plants, weather, and care history.',
    cropRotation: 'Plan 3 years ahead with smart crop rotation recommendations to keep your soil healthy.',
    expertQuestionCalls: 'Ask our AI garden expert questions with full context about your specific garden.',
  };
  return benefitMap[feature] || 'Unlock this premium feature to enhance your gardening experience.';
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

/**
 * Gate specifically for Bloom-tier weather features
 */
export function BloomWeatherGate({
  children,
  feature,
  ...props
}: Omit<GrowPremiumGateProps, 'requireTier'> & { feature: 'soilTemperature' | 'frostAlerts' | 'weatherThreats' | 'windAwareness' | 'smartWatering' }) {
  return (
    <GrowPremiumGate feature={feature} requireTier="bloom" {...props}>
      {children}
    </GrowPremiumGate>
  );
}

/**
 * Gate specifically for Harvest-tier features
 */
export function HarvestGate({
  children,
  feature,
  ...props
}: Omit<GrowPremiumGateProps, 'requireTier'>) {
  return (
    <GrowPremiumGate feature={feature} requireTier="harvest" {...props}>
      {children}
    </GrowPremiumGate>
  );
}

/**
 * Simple inline lock badge for showing feature is premium
 */
export function PremiumBadge({
  feature,
  className = '',
}: {
  feature: FeatureKey;
  className?: string;
}) {
  const { canUse } = useGrowSubscription();

  if (canUse(feature)) {
    return null;
  }

  const requiredTier = getMinimumTierForFeature(feature);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full ${className}`}
      title={`Requires ${getTierDisplayName(requiredTier)}`}
    >
      <Lock className="h-3 w-3" />
      {getTierDisplayName(requiredTier)}
    </span>
  );
}
