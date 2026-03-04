/**
 * Subscription Card
 *
 * Shows the user's current subscription tier with a summary of benefits
 * and easy upgrade options.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import {
  Crown,
  Leaf,
  Sparkles,
  Check,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import { GrowSubscriptionTier, GROW_TIERS } from '@/lib/grow/subscription';

const TIER_CONFIG: Record<GrowSubscriptionTier, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  seed: {
    icon: Leaf,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  sprout: {
    icon: Leaf,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  bloom: {
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
  },
  harvest: {
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  orchard: {
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
};

// Key features that differentiate each tier
const TIER_HIGHLIGHTS: Record<GrowSubscriptionTier, string[]> = {
  seed: [
    '25 plants',
    '5 AI IDs/month',
    '3-day forecast',
  ],
  sprout: [
    '75 plants',
    '20 AI IDs/month',
    'Hardware integrations',
    'Export data',
  ],
  bloom: [
    'Unlimited plants & AI IDs',
    'Soil temperature (4 depths)',
    '48hr frost alerts',
    'Weather threat engine',
  ],
  harvest: [
    'Everything in Bloom',
    'AI Expert (2/month)',
    'Yield predictions',
    'Team sharing (5)',
  ],
  orchard: [
    'Everything in Harvest',
    'White-label portals',
    'Full API access',
    'Commercial license',
  ],
};

interface SubscriptionCardProps {
  compact?: boolean;
}

export function SubscriptionCard({ compact = false }: SubscriptionCardProps) {
  const { tier, isLoading, isPaid } = useGrowSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = GROW_TIERS[tier];
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  const highlights = TIER_HIGHLIGHTS[tier];

  if (compact) {
    return (
      <Card className={`${config.borderColor} border-2`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <p className="font-semibold">{tierInfo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {isPaid ? 'Premium Member' : 'Free Plan'}
                </p>
              </div>
            </div>
            <Link href="/grow/premium">
              <Button variant={isPaid ? 'outline' : 'default'} size="sm" className={!isPaid ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {isPaid ? 'Manage' : 'Upgrade'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {tierInfo.name}
                {isPaid && (
                  <span className="text-xs font-normal bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </CardTitle>
              <CardDescription>{tierInfo.tagline}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tier features */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Your plan includes:</p>
          <ul className="space-y-1.5">
            {highlights.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* View plans link */}
        <div className="border-t pt-4">
          <Link href="/grow/premium">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              View all plans and features
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* View all plans link */}
        <div className="text-center pt-2">
          <Link
            href="/grow/premium"
            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View all plans & features →
          </Link>
        </div>

        {/* iOS-specific: Manage Subscription + Restore Purchases */}
        {Capacitor.getPlatform() === 'ios' && (
          <IOSSubscriptionActions isPaid={isPaid} />
        )}
      </CardContent>
    </Card>
  );
}

function IOSSubscriptionActions({ isPaid }: { isPaid: boolean }) {
  const [restoring, setRestoring] = useState(false);
  const { refetch } = useGrowSubscription();

  const handleRestore = async () => {
    try {
      setRestoring(true);
      const { restorePurchases } = await import('@/lib/grow/revenueCat');
      await restorePurchases();
      await refetch();
    } catch {
      // Error already logged in revenueCat.ts
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="border-t pt-3 space-y-2">
      {/* Manage Subscription → iOS Settings */}
      {isPaid && (
        <a
          href="itms-apps://apps.apple.com/account/subscriptions"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Manage Subscription
        </a>
      )}

      {/* Restore Purchases */}
      <button
        onClick={handleRestore}
        disabled={restoring}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {restoring ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        {restoring ? 'Restoring...' : 'Restore Purchases'}
      </button>
    </div>
  );
}

export default SubscriptionCard;
