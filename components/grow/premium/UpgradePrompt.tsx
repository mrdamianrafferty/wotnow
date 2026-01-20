/**
 * Upgrade Prompt Component
 *
 * Contextual upgrade prompts shown at high-converting moments:
 * - Usage limits reached
 * - Feature discovery points
 * - After completing tasks
 *
 * @module components/grow/premium/UpgradePrompt
 */

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  ArrowRight,
  Thermometer,
  AlertTriangle,
  Wind,
  Droplets,
  Leaf,
  Camera,
  Bug,
  MessageSquare,
  ChartBar,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GrowSubscriptionTier,
  getTierDisplayName,
  formatPrice,
  GROW_TIERS,
} from '@/lib/grow/subscription';

// =============================================================================
// TYPES
// =============================================================================

type UpgradeReason =
  | 'plant_limit'
  | 'plant_id_limit'
  | 'pest_diagnosis_limit'
  | 'photo_limit'
  | 'expert_question_limit'
  | 'soil_temp'
  | 'frost_alert'
  | 'weather_threat'
  | 'smart_watering'
  | 'wind_awareness'
  | 'guilds'
  | 'analytics'
  | 'yield_predictions'
  | 'crop_rotation'
  | 'beds_limit'
  | 'general';

interface UpgradePromptProps {
  /**
   * Why the upgrade is being prompted
   */
  reason: UpgradeReason;

  /**
   * Recommended tier to upgrade to
   */
  recommendedTier?: GrowSubscriptionTier;

  /**
   * Current usage count (for limit prompts)
   */
  currentUsage?: number;

  /**
   * Limit that was reached (for limit prompts)
   */
  limit?: number;

  /**
   * Dismissible prompt (shows X button)
   */
  dismissible?: boolean;

  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;

  /**
   * Compact/inline variant
   */
  variant?: 'card' | 'inline' | 'banner' | 'modal';

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// CONTENT CONFIG
// =============================================================================

interface PromptContent {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaText: string;
  tier: GrowSubscriptionTier;
}

const PROMPT_CONTENT: Record<UpgradeReason, PromptContent> = {
  plant_limit: {
    icon: Leaf,
    title: 'You\'re growing!',
    description: 'You\'ve reached your plant limit. Upgrade to track more of your garden.',
    ctaText: 'Track unlimited plants',
    tier: 'bloom',
  },
  plant_id_limit: {
    icon: Camera,
    title: 'Keep identifying!',
    description: 'You\'ve used all your plant identifications this month.',
    ctaText: 'Get unlimited identifications',
    tier: 'bloom',
  },
  pest_diagnosis_limit: {
    icon: Bug,
    title: 'Protect your plants',
    description: 'You\'ve used all your pest & disease diagnoses this month.',
    ctaText: 'Get more diagnoses',
    tier: 'sprout',
  },
  photo_limit: {
    icon: Camera,
    title: 'Capture more moments',
    description: 'You\'ve reached your photo storage limit.',
    ctaText: 'Get unlimited photos',
    tier: 'sprout',
  },
  expert_question_limit: {
    icon: MessageSquare,
    title: 'Need expert advice?',
    description: 'Upgrade to ask our AI garden expert more questions.',
    ctaText: 'Ask the expert',
    tier: 'harvest',
  },
  soil_temp: {
    icon: Thermometer,
    title: 'Know when to plant',
    description: 'Soil temperature at 4 depths - know exactly when seeds will germinate.',
    ctaText: 'See soil temperature',
    tier: 'bloom',
  },
  frost_alert: {
    icon: AlertTriangle,
    title: 'Frost detected!',
    description: 'Get 48-hour frost warnings to protect your tender plants.',
    ctaText: 'Enable frost alerts',
    tier: 'bloom',
  },
  weather_threat: {
    icon: Bug,
    title: 'Conditions favor pests',
    description: 'Weather conditions match disease outbreak patterns. Get detailed alerts.',
    ctaText: 'See threat details',
    tier: 'bloom',
  },
  smart_watering: {
    icon: Droplets,
    title: 'Save water, save time',
    description: 'Get smart watering recommendations based on soil moisture and rain forecast.',
    ctaText: 'Enable smart watering',
    tier: 'bloom',
  },
  wind_awareness: {
    icon: Wind,
    title: 'Windy conditions ahead',
    description: 'Know when to adjust watering, skip spraying, or protect seedlings.',
    ctaText: 'See wind recommendations',
    tier: 'bloom',
  },
  guilds: {
    icon: Leaf,
    title: 'Companion planting guilds',
    description: 'Access all 84 permaculture guilds to maximize your garden productivity.',
    ctaText: 'Explore all guilds',
    tier: 'bloom',
  },
  analytics: {
    icon: ChartBar,
    title: 'Track your progress',
    description: 'See charts, trends, and insights about your garden performance.',
    ctaText: 'View analytics',
    tier: 'harvest',
  },
  yield_predictions: {
    icon: Sparkles,
    title: 'Predict your harvest',
    description: 'AI-powered yield predictions based on your plants and weather.',
    ctaText: 'See predictions',
    tier: 'harvest',
  },
  crop_rotation: {
    icon: Leaf,
    title: 'Plan your rotation',
    description: 'Keep your soil healthy with smart 3-year crop rotation planning.',
    ctaText: 'Plan rotations',
    tier: 'bloom',
  },
  beds_limit: {
    icon: Leaf,
    title: 'Create more beds',
    description: 'You\'ve reached your bed limit. Upgrade to create more garden beds.',
    ctaText: 'Get more beds',
    tier: 'sprout',
  },
  general: {
    icon: Crown,
    title: 'Go Premium',
    description: 'Unlock weather intelligence, unlimited plants, and smart gardening features.',
    ctaText: 'See all features',
    tier: 'bloom',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function UpgradePrompt({
  reason,
  recommendedTier,
  currentUsage,
  limit,
  dismissible = true,
  onDismiss,
  variant = 'card',
  className = '',
}: UpgradePromptProps) {
  const content = PROMPT_CONTENT[reason];
  const tier = recommendedTier || content.tier;
  const tierInfo = GROW_TIERS[tier];
  const Icon = content.icon;

  // Render based on variant
  switch (variant) {
    case 'inline':
      return (
        <InlinePrompt
          content={content}
          tier={tier}
          tierInfo={tierInfo}
          dismissible={dismissible}
          onDismiss={onDismiss}
          currentUsage={currentUsage}
          limit={limit}
          className={className}
        />
      );

    case 'banner':
      return (
        <BannerPrompt
          content={content}
          tier={tier}
          tierInfo={tierInfo}
          dismissible={dismissible}
          onDismiss={onDismiss}
          currentUsage={currentUsage}
          limit={limit}
          className={className}
        />
      );

    case 'modal':
      return (
        <ModalPrompt
          content={content}
          tier={tier}
          tierInfo={tierInfo}
          dismissible={dismissible}
          onDismiss={onDismiss}
          currentUsage={currentUsage}
          limit={limit}
          Icon={Icon}
          className={className}
        />
      );

    case 'card':
    default:
      return (
        <CardPrompt
          content={content}
          tier={tier}
          tierInfo={tierInfo}
          dismissible={dismissible}
          onDismiss={onDismiss}
          currentUsage={currentUsage}
          limit={limit}
          Icon={Icon}
          className={className}
        />
      );
  }
}

// =============================================================================
// VARIANT COMPONENTS
// =============================================================================

interface PromptVariantProps {
  content: PromptContent;
  tier: GrowSubscriptionTier;
  tierInfo: typeof GROW_TIERS[GrowSubscriptionTier];
  dismissible: boolean;
  onDismiss?: () => void;
  currentUsage?: number;
  limit?: number;
  className: string;
  Icon?: React.ComponentType<{ className?: string }>;
}

function CardPrompt({
  content,
  tier,
  tierInfo,
  dismissible,
  onDismiss,
  currentUsage,
  limit,
  Icon,
  className,
}: PromptVariantProps) {
  const IconComponent = Icon || content.icon;

  return (
    <Card className={`border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 ${className}`}>
      <CardContent className="p-4 sm:p-6">
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Icon */}
          <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
            <IconComponent className="h-6 w-6 text-emerald-600" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                {content.title}
                <Sparkles className="h-4 w-4 text-amber-500" />
              </h3>
              <p className="text-sm text-emerald-700 mt-1">
                {content.description}
              </p>
              {typeof currentUsage === 'number' && typeof limit === 'number' && (
                <p className="text-xs text-emerald-600 mt-1">
                  Used: {currentUsage} / {limit}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link href="/grow/premium" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                  {content.ctaText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <span className="text-xs text-emerald-600">
                {getTierDisplayName(tier)} from {formatPrice(tierInfo.pricing.monthly)}/mo
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InlinePrompt({
  content,
  tier,
  tierInfo,
  dismissible,
  onDismiss,
  className,
}: PromptVariantProps) {
  return (
    <div className={`flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg ${className}`}>
      <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
      <span className="text-sm text-emerald-800 flex-1">
        {content.description}{' '}
        <Link href="/grow/premium" className="text-emerald-600 font-semibold hover:underline">
          {content.ctaText}
        </Link>
        <span className="text-emerald-500 text-xs ml-1">
          ({getTierDisplayName(tier)} {formatPrice(tierInfo.pricing.monthly)}/mo)
        </span>
      </span>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-emerald-400 hover:text-emerald-600 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function BannerPrompt({
  content,
  tier,
  dismissible,
  onDismiss,
  className,
}: PromptVariantProps) {
  return (
    <div className={`bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <span className="text-sm font-medium">
            {content.title} - {content.description}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/grow/premium"
            className="text-sm font-semibold text-white hover:text-emerald-100 underline flex items-center gap-1"
          >
            Upgrade to {getTierDisplayName(tier)}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-white/70 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalPrompt({
  content,
  tier,
  tierInfo,
  dismissible,
  onDismiss,
  currentUsage,
  limit,
  Icon,
  className,
}: PromptVariantProps) {
  const IconComponent = Icon || content.icon;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${className}`}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white text-center relative">
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <IconComponent className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">{content.title}</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center">{content.description}</p>

          {typeof currentUsage === 'number' && typeof limit === 'number' && (
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {currentUsage} / {limit}
              </div>
              <div className="text-xs text-gray-500">used this month</div>
            </div>
          )}

          {/* Tier highlight */}
          <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-emerald-900">{getTierDisplayName(tier)}</div>
                <div className="text-xs text-emerald-600">{tierInfo.tagline}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-700">
                  {formatPrice(tierInfo.pricing.monthly)}
                </div>
                <div className="text-xs text-emerald-600">/month</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Link href="/grow/premium" className="block">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base">
              <Sparkles className="h-5 w-5 mr-2" />
              {content.ctaText}
            </Button>
          </Link>

          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Pre-configured prompt for plant limit reached
 */
export function PlantLimitPrompt(props: Omit<UpgradePromptProps, 'reason'>) {
  return <UpgradePrompt reason="plant_limit" {...props} />;
}

/**
 * Pre-configured prompt for AI usage limit reached
 */
export function AILimitPrompt({
  type,
  ...props
}: Omit<UpgradePromptProps, 'reason'> & { type: 'plant_id' | 'pest_diagnosis' | 'expert' }) {
  const reasonMap = {
    plant_id: 'plant_id_limit',
    pest_diagnosis: 'pest_diagnosis_limit',
    expert: 'expert_question_limit',
  } as const;
  return <UpgradePrompt reason={reasonMap[type]} {...props} />;
}

/**
 * Pre-configured prompt for weather features
 */
export function WeatherFeaturePrompt({
  feature,
  ...props
}: Omit<UpgradePromptProps, 'reason'> & {
  feature: 'soil_temp' | 'frost_alert' | 'weather_threat' | 'smart_watering' | 'wind_awareness';
}) {
  return <UpgradePrompt reason={feature} {...props} />;
}
