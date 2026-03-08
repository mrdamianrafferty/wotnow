/**
 * Go Daisy+ Upgrade Prompt
 *
 * Context-aware upgrade prompt shown when free users encounter gated features.
 * Uses DaisyUI card styling with Framer Motion slide-up animation.
 *
 * @module components/GoDaisyUpgradePrompt
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  ArrowRight,
  Calendar,
  Activity,
  CloudRain,
  MapPin,
  Bell,
  Users,
  Star,
  Wifi,
  Lock,
} from 'lucide-react';
import {
  GODAISY_PRICING,
  UPGRADE_HEADLINES,
  formatPrice,
} from '@/lib/godaisy/subscription';

// =============================================================================
// TYPES
// =============================================================================

export type GoDaisyUpgradeFeature =
  | 'forecast'
  | 'activities'
  | 'environmental'
  | 'coastal'
  | 'notifications'
  | 'social'
  | 'astronomy'
  | 'planned'
  | 'offline'
  | 'general';

interface GoDaisyUpgradePromptProps {
  feature: GoDaisyUpgradeFeature;
  dismissible?: boolean;
  onDismiss?: () => void;
  variant?: 'card' | 'inline' | 'banner';
  className?: string;
}

// =============================================================================
// CONTENT CONFIG
// =============================================================================

interface PromptContent {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  description: string;
  ctaText: string;
}

const PROMPT_CONTENT: Record<GoDaisyUpgradeFeature, PromptContent> = {
  forecast: {
    icon: Calendar,
    headline: UPGRADE_HEADLINES.forecast,
    description: 'Plan ahead with extended 14-day weather forecasts for all your activities.',
    ctaText: 'See 14-day forecast',
  },
  activities: {
    icon: Activity,
    headline: UPGRADE_HEADLINES.activities,
    description: 'Track unlimited outdoor activities with personalised weather-based recommendations.',
    ctaText: 'Unlock all activities',
  },
  environmental: {
    icon: CloudRain,
    headline: UPGRADE_HEADLINES.environmental,
    description: 'Access pollen counts, soil moisture, pressure trends, and visibility data.',
    ctaText: 'See environmental data',
  },
  coastal: {
    icon: MapPin,
    headline: UPGRADE_HEADLINES.coastal,
    description: 'Add a second location for coastal weather, tides, and marine conditions.',
    ctaText: 'Add coastal location',
  },
  notifications: {
    icon: Bell,
    headline: UPGRADE_HEADLINES.notifications,
    description: 'Get notified when conditions are perfect for your favourite activities.',
    ctaText: 'Enable notifications',
  },
  social: {
    icon: Users,
    headline: UPGRADE_HEADLINES.social,
    description: 'Invite friends, create polls, and discover activity-friendly venues nearby.',
    ctaText: 'Unlock social features',
  },
  astronomy: {
    icon: Star,
    headline: UPGRADE_HEADLINES.astronomy,
    description: 'ISS passes, meteor showers, and aurora alerts tailored to your location.',
    ctaText: 'See astronomy events',
  },
  planned: {
    icon: Calendar,
    headline: UPGRADE_HEADLINES.planned,
    description: 'Plan activities in advance and journal your outdoor experiences.',
    ctaText: 'Start your journal',
  },
  offline: {
    icon: Wifi,
    headline: UPGRADE_HEADLINES.offline,
    description: 'Access your forecast and activity data even without an internet connection.',
    ctaText: 'Enable offline mode',
  },
  general: {
    icon: Lock,
    headline: 'Upgrade to Go Daisy+',
    description: 'Unlock unlimited activities, 14-day forecasts, and all premium features.',
    ctaText: 'See all features',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function GoDaisyUpgradePrompt({
  feature,
  dismissible = true,
  onDismiss,
  variant = 'card',
  className = '',
}: GoDaisyUpgradePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const content = PROMPT_CONTENT[feature];
  const Icon = content.icon;
  const annualPrice = formatPrice(GODAISY_PRICING.annual.amount);

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg ${className}`}>
        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm text-cyan-800 flex-1">
          {content.description}{' '}
          <Link href="/godaisy-plus" className="text-cyan-600 font-semibold hover:underline">
            {content.ctaText}
          </Link>
          <span className="text-cyan-500 text-xs ml-1">
            (from {annualPrice}/yr)
          </span>
        </span>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 text-cyan-400 hover:text-cyan-600 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-3 ${className}`}
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-medium">{content.headline}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/godaisy-plus"
                className="text-sm font-semibold text-white hover:text-cyan-100 underline flex items-center gap-1"
              >
                Upgrade
                <ArrowRight className="h-4 w-4" />
              </Link>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="p-1 text-white/70 hover:text-white"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default: card variant with slide-up animation
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`card bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 shadow-sm ${className}`}
      >
        <div className="card-body p-4 sm:p-6">
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-cyan-400 hover:text-cyan-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="p-3 bg-cyan-100 rounded-xl shrink-0">
              <Icon className="h-6 w-6 text-cyan-600" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-cyan-900 flex items-center gap-2">
                  {content.headline}
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </h3>
                <p className="text-sm text-cyan-700 mt-1">{content.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link href="/godaisy-plus" className="w-full sm:w-auto">
                  <button className="btn btn-sm bg-cyan-600 hover:bg-cyan-700 text-white border-none w-full sm:w-auto">
                    {content.ctaText}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                </Link>
                <span className="text-xs text-cyan-600">
                  Go Daisy+ from {annualPrice}/yr
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
