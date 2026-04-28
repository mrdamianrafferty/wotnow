/**
 * Pricing Overview Component
 *
 * Shows a clear summary of subscription tiers and what's included.
 * Used on Info and Settings pages to help users understand premium features.
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Leaf,
  Sparkles,
  Crown,
  Check,
  ChevronRight,
  Thermometer,
  AlertTriangle,
  Bug,
  Radio,
  Camera,
  Infinity,
  Users,
} from 'lucide-react';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';

interface PricingOverviewProps {
  compact?: boolean;
}

const TIERS = [
  {
    id: 'seed',
    name: 'Seed',
    tagline: 'Free Forever',
    price: 'Free',
    icon: Leaf,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    features: [
      '25 plants',
      '5 AI IDs/month',
      '3-day forecast',
      'Basic tasks',
    ],
  },
  {
    id: 'sprout',
    name: 'Sprout',
    tagline: 'For keen gardeners',
    price: '€3.99/mo',
    annualPrice: '€29.99/yr',
    icon: Leaf,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    features: [
      '75 plants',
      '20 AI IDs/month',
      '7-day forecast',
      'Hardware integrations',
      'Export data',
    ],
    highlight: 'Hardware',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    tagline: 'Serious growers',
    price: '€6.99/mo',
    annualPrice: '€49.99/yr',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    popular: true,
    features: [
      'Unlimited plants & AI',
      'Soil temp (4 depths)',
      '48hr frost alerts',
      'Weather threat engine',
      'Offline mode',
    ],
    highlight: 'Weather Intelligence',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    tagline: 'Market gardeners',
    price: '€11.99/mo',
    annualPrice: '€79.99/yr',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    features: [
      'Everything in Bloom',
      'AI Expert (2/month)',
      'Yield predictions',
      'Team sharing (5)',
      '5-year history',
    ],
    highlight: 'Team Features',
    comingSoon: true,
  },
];

function FeatureIcon({ feature }: { feature: string }) {
  const lowerFeature = feature.toLowerCase();

  if (lowerFeature.includes('unlimited')) return <Infinity className="h-3.5 w-3.5 text-emerald-500" />;
  if (lowerFeature.includes('soil') || lowerFeature.includes('temperature')) return <Thermometer className="h-3.5 w-3.5 text-orange-500" />;
  if (lowerFeature.includes('frost') || lowerFeature.includes('alert')) return <AlertTriangle className="h-3.5 w-3.5 text-blue-500" />;
  if (lowerFeature.includes('threat') || lowerFeature.includes('pest')) return <Bug className="h-3.5 w-3.5 text-red-500" />;
  if (lowerFeature.includes('hardware') || lowerFeature.includes('integration')) return <Radio className="h-3.5 w-3.5 text-[var(--gd-moss)]" />;
  if (lowerFeature.includes('ai') || lowerFeature.includes('id')) return <Camera className="h-3.5 w-3.5 text-indigo-500" />;
  if (lowerFeature.includes('team') || lowerFeature.includes('sharing')) return <Users className="h-3.5 w-3.5 text-cyan-500" />;

  return <Check className="h-3.5 w-3.5 text-emerald-500" />;
}

export function PricingOverview({ compact = false }: PricingOverviewProps) {
  const { tier, isPaid, isLoading } = useGrowSubscription();

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

  if (compact) {
    // Compact version - just shows current tier and upgrade CTA
    const currentTierIndex = TIERS.findIndex(t => t.id === tier);
    // Find the next available tier (skip Coming Soon tiers)
    const nextTier = TIERS.slice(currentTierIndex + 1).find(t => !('comingSoon' in t && t.comingSoon)) || null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription Plans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {TIERS.slice(0, 3).map((t) => {
              const Icon = t.icon;
              const isCurrent = t.id === tier;
              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-lg border-2 ${isCurrent ? t.borderColor + ' ' + t.bgColor : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${t.color}`} />
                    <span className="font-medium text-sm">{t.name}</span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[10px] px-1">Current</Badge>
                    )}
                    {t.popular && !isCurrent && (
                      <Badge className="text-[10px] px-1 bg-emerald-500">Best</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.price}</p>
                  {t.highlight && (
                    <p className="text-[10px] text-emerald-600 mt-1">{t.highlight}</p>
                  )}
                </div>
              );
            })}
          </div>

          {nextTier && (
            <Link href="/grow/premium">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                Upgrade to {nextTier.name}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}

          <Link
            href="/grow/premium"
            className="block text-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View all plans & features
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Full version - shows all tiers with features
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Subscription Plans
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your gardening needs
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier cards */}
        <div className="grid gap-3">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isCurrent = t.id === tier;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isCurrent
                    ? t.borderColor + ' ' + t.bgColor
                    : t.popular
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${t.bgColor}`}>
                      <Icon className={`h-5 w-5 ${t.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{t.name}</h4>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">Your Plan</Badge>
                        )}
                        {t.popular && !isCurrent && (
                          <Badge className="text-xs bg-emerald-500">Most Popular</Badge>
                        )}
                        {'comingSoon' in t && t.comingSoon && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Coming Soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.tagline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{t.price}</p>
                    {t.annualPrice && (
                      <p className="text-xs text-muted-foreground">{t.annualPrice}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {t.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <FeatureIcon feature={feature} />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/grow/premium" className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              {isPaid ? 'Manage Subscription' : 'View All Plans'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Lifetime option hint */}
        <p className="text-xs text-center text-muted-foreground">
          Lifetime purchases available - pay once, use forever
        </p>
      </CardContent>
    </Card>
  );
}

export default PricingOverview;
