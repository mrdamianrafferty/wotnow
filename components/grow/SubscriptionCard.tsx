/**
 * Subscription Card
 *
 * Shows the user's current subscription tier with a summary of benefits
 * and easy upgrade options.
 */

import Link from 'next/link';
import {
  Crown,
  Leaf,
  Sparkles,
  Check,
  ChevronRight,
  Thermometer,
  AlertTriangle,
  Bug,
  Radio,
  Camera,
  Infinity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import { GrowSubscriptionTier, GROW_TIERS, formatPrice } from '@/lib/grow/subscription';

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

  // Get next tier for upgrade prompt
  const tierOrder: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];
  const currentIndex = tierOrder.indexOf(tier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  const nextTierInfo = nextTier ? GROW_TIERS[nextTier] : null;

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

        {/* Upgrade prompt for non-max tiers */}
        {nextTier && nextTierInfo && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Upgrade to {nextTierInfo.name} for:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {TIER_HIGHLIGHTS[nextTier].slice(0, 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UpgradeFeatureIcon feature={feature} />
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold">
                    {formatPrice(nextTierInfo.pricing.annual)}
                  </span>
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>
                <Link href="/grow/premium">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    Upgrade to {nextTierInfo.name}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Already at max tier */}
        {!nextTier && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Crown className="h-4 w-4" />
              <span>You have our highest tier - thank you for your support!</span>
            </div>
          </div>
        )}

        {/* View all plans link */}
        <div className="text-center pt-2">
          <Link
            href="/grow/premium"
            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View all plans & features →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradeFeatureIcon({ feature }: { feature: string }) {
  const lowerFeature = feature.toLowerCase();

  if (lowerFeature.includes('unlimited')) return <Infinity className="h-3 w-3 text-emerald-500" />;
  if (lowerFeature.includes('soil') || lowerFeature.includes('temperature')) return <Thermometer className="h-3 w-3 text-orange-500" />;
  if (lowerFeature.includes('frost') || lowerFeature.includes('alert')) return <AlertTriangle className="h-3 w-3 text-blue-500" />;
  if (lowerFeature.includes('threat') || lowerFeature.includes('pest')) return <Bug className="h-3 w-3 text-red-500" />;
  if (lowerFeature.includes('hardware') || lowerFeature.includes('integration')) return <Radio className="h-3 w-3 text-purple-500" />;
  if (lowerFeature.includes('ai') || lowerFeature.includes('id')) return <Camera className="h-3 w-3 text-indigo-500" />;

  return <Check className="h-3 w-3 text-emerald-500" />;
}

export default SubscriptionCard;
