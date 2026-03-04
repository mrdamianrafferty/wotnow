/**
 * Grow Daisy Premium Page
 *
 * Shows pricing tiers and allows users to subscribe.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Capacitor } from '@capacitor/core';
import Head from 'next/head';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  Leaf,
  Thermometer,
  AlertTriangle,
  Droplets,
  Wind,
  ChartBar,
  Users,
  Camera,
  Bug,
  MessageSquare,
  Crown,
  Zap,
  Radio,
  Wifi,
  Cloud,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/client';
import {
  GrowSubscriptionTier,
  GrowSubscriptionType,
  GROW_TIERS,
  formatPrice,
  getTierDisplayName,
} from '@/lib/grow/subscription';
import { GrowLayout } from '@/components/grow/GrowLayout';
import type { GrowDaisyPackage } from '@/lib/grow/growDaisySubs';

type BillingCycle = 'monthly' | 'annual' | 'lifetime';

const TIER_ICONS: Record<GrowSubscriptionTier, React.ComponentType<{ className?: string }>> = {
  seed: Leaf,
  sprout: Leaf,
  bloom: Sparkles,
  harvest: Crown,
  orchard: Crown,
};

export default function GrowPremiumPage() {
  const router = useRouter();
  const { tier: currentTier, isLoading, refetch } = useGrowSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loadingTier, setLoadingTier] = useState<GrowSubscriptionTier | null>(null);
  const [error, setError] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const supabase = createClient();

  // iOS IAP state
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [packages, setPackages] = useState<GrowDaisyPackage[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(isIOS);
  const [activating, setActivating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Load RevenueCat offerings on iOS via native bridge
  useEffect(() => {
    if (!isIOS) return;

    let cancelled = false;
    (async () => {
      try {
        const { identifyUser, fetchOfferings } = await import('@/lib/grow/growDaisySubs');

        // Identify user with RevenueCat if logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await identifyUser(user.id);
        }

        const result = await fetchOfferings();
        if (!cancelled) {
          setPackages(result);
          console.log('[Premium] Packages:', result.map(p => ({
            identifier: p.identifier,
            productId: p.productIdentifier,
          })));
        }
      } catch (err) {
        console.error('[Premium] Failed to load offerings:', err);
      } finally {
        if (!cancelled) setOfferingsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isIOS, supabase]);

  /**
   * Find the package matching a tier + billing cycle.
   * Packages contain product IDs like "growdaisy_bloom_monthly".
   */
  const findPackage = useCallback((tier: GrowSubscriptionTier): GrowDaisyPackage | null => {
    if (!packages.length) return null;

    const expectedProductId = `growdaisy_${tier}_${billingCycle}`;
    return packages.find(p => p.productIdentifier === expectedProductId) ?? null;
  }, [packages, billingCycle]);

  /**
   * Handle iOS In-App Purchase via native RevenueCat bridge
   */
  const handleIOSPurchase = async (tier: GrowSubscriptionTier) => {
    try {
      setLoadingTier(tier);
      setError('');

      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/grow/auth?redirect=/grow/premium');
        return;
      }

      const pkg = findPackage(tier);
      if (!pkg) {
        setError('This plan is not available. Please try a different billing cycle.');
        return;
      }

      const { purchaseProduct } = await import('@/lib/grow/growDaisySubs');
      const result = await purchaseProduct(pkg.productIdentifier);

      if (!result.cancelled) {
        // Purchase succeeded — webhook will update Supabase
        setActivating(true);
        // Poll for tier change (webhook -> Supabase -> realtime)
        // Give up after 15 seconds, but user will see it on next load either way
        const start = Date.now();
        while (Date.now() - start < 15000) {
          await new Promise(r => setTimeout(r, 2000));
          await refetch();
          break;
        }
        setActivating(false);
      }
      // cancelled === true means user cancelled — do nothing
    } catch (err) {
      console.error('iOS purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  /**
   * Restore previous purchases (Apple requirement)
   */
  const handleRestore = async () => {
    try {
      setRestoring(true);
      setError('');

      const { restorePurchases } = await import('@/lib/grow/growDaisySubs');
      await restorePurchases();
      await refetch();
    } catch (err) {
      console.error('Restore error:', err);
      setError('Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Handle web Stripe checkout
   */
  const handleSubscribe = async (tier: GrowSubscriptionTier) => {
    if (isIOS) {
      return handleIOSPurchase(tier);
    }

    try {
      setLoadingTier(tier);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/grow/auth?redirect=/grow/premium');
        return;
      }

      const response = await fetch('/api/grow/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          tier,
          billingType: billingCycle as GrowSubscriptionType,
          voucherCode: voucherCode.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripeClient = await getStripe();
      if (stripeClient && data.sessionId) {
        // @ts-expect-error - redirectToCheckout exists
        await stripeClient.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  /**
   * Get price string — on iOS from RevenueCat (localized), on web from static EUR prices
   */
  const getPrice = (tier: GrowSubscriptionTier): string => {
    if (isIOS) {
      const pkg = findPackage(tier);
      if (pkg) return pkg.priceString;
      // Fallback to static EUR price if package not found
    }
    const tierInfo = GROW_TIERS[tier];
    const price = tierInfo.pricing[billingCycle];
    if (price === null) return 'N/A';
    return formatPrice(price);
  };

  const getSavings = (tier: GrowSubscriptionTier): string | null => {
    const tierInfo = GROW_TIERS[tier];
    if (billingCycle === 'monthly' || !tierInfo.pricing.monthly) return null;

    const monthlyTotal = tierInfo.pricing.monthly * (billingCycle === 'annual' ? 12 : 24);
    const currentPrice = tierInfo.pricing[billingCycle];
    if (!currentPrice) return null;

    const savings = Math.round(((monthlyTotal - currentPrice) / monthlyTotal) * 100);
    return savings > 0 ? `Save ${savings}%` : null;
  };

  if (isLoading || offeringsLoading) {
    return (
      <GrowLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading loading-spinner loading-lg text-emerald-600"></div>
        </div>
      </GrowLayout>
    );
  }

  // Show activating overlay when waiting for webhook confirmation
  if (activating) {
    return (
      <GrowLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
            <Loader2 className="h-12 w-12 text-emerald-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Activating...</h2>
            <p className="text-gray-600">
              Your purchase is being activated. This usually takes a few seconds.
            </p>
          </div>
        </div>
      </GrowLayout>
    );
  }

  return (
    <GrowLayout>
      <Head>
        <title>Grow Daisy Premium - Weather-Smart Gardening</title>
        <meta name="description" content="Unlock soil temperature, frost alerts, and smart watering with Grow Daisy Premium" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-green-100 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Weather-Smart Gardening</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Grow Daisy Premium
            </h1>
            <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
              Know exactly when to plant, water, and protect your garden with real weather intelligence
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 -mt-8">
          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-full p-1 shadow-lg inline-flex">
              {(['monthly', 'annual', 'lifetime'] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === cycle
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  {cycle === 'monthly' && 'Monthly'}
                  {cycle === 'annual' && 'Annual'}
                  {cycle === 'lifetime' && 'Lifetime'}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Sprout */}
            <PricingCard
              tier="sprout"
              currentTier={currentTier}
              billingCycle={billingCycle}
              price={getPrice('sprout')}
              savings={getSavings('sprout')}
              loading={loadingTier === 'sprout'}
              onSubscribe={() => handleSubscribe('sprout')}
              features={[
                { icon: Leaf, text: '75 plants' },
                { icon: Camera, text: '20 AI IDs/month' },
                { icon: Bug, text: '10 diagnoses/month' },
                { icon: Camera, text: 'Unlimited photos' },
                { icon: Check, text: '7-day forecast' },
                { icon: Radio, text: 'Hardware integrations', highlight: true },
                { icon: Check, text: 'Export data' },
              ]}
            />

            {/* Bloom - Recommended */}
            <PricingCard
              tier="bloom"
              currentTier={currentTier}
              billingCycle={billingCycle}
              price={getPrice('bloom')}
              savings={getSavings('bloom')}
              loading={loadingTier === 'bloom'}
              onSubscribe={() => handleSubscribe('bloom')}
              recommended
              features={[
                { icon: Leaf, text: 'Unlimited plants', highlight: true },
                { icon: Camera, text: 'Unlimited AI IDs', highlight: true },
                { icon: Thermometer, text: 'Soil temp (4 depths)', highlight: true },
                { icon: AlertTriangle, text: '48hr frost alerts', highlight: true },
                { icon: Bug, text: 'Weather threat engine', highlight: true },
                { icon: Wind, text: 'Wind-aware gardening', highlight: true },
                { icon: Droplets, text: 'Smart watering', highlight: true },
                { icon: Check, text: '14-day forecast' },
              ]}
            />

            {/* Harvest */}
            <PricingCard
              tier="harvest"
              currentTier={currentTier}
              billingCycle={billingCycle}
              price={getPrice('harvest')}
              savings={getSavings('harvest')}
              loading={loadingTier === 'harvest'}
              onSubscribe={() => handleSubscribe('harvest')}
              features={[
                { icon: Check, text: 'Everything in Bloom' },
                { icon: MessageSquare, text: 'AI Expert (2/mo)' },
                { icon: ChartBar, text: 'Yield predictions' },
                { icon: ChartBar, text: 'Analytics dashboard' },
                { icon: Leaf, text: 'Crop rotation planner' },
                { icon: Users, text: 'Team sharing (5)' },
                { icon: Check, text: '5-year history' },
              ]}
            />
          </div>

          {/* Voucher Code — hidden on iOS (Apple prohibits bypassing their payment) */}
          {!isIOS && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-white rounded-lg p-4 shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Have a voucher code?
                </label>
                <input
                  type="text"
                  placeholder="EARLYBIRD25"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          )}

          {/* Restore Purchases — iOS only (Apple requirement) */}
          {isIOS && (
            <div className="max-w-md mx-auto mb-4 text-center">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {restoring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </button>
            </div>
          )}

          {/* Subscription disclosure + legal links (Apple Guideline 3.1.2) */}
          {isIOS && (
            <div className="max-w-md mx-auto mb-8 text-center">
              <p className="text-xs text-gray-500 mb-2">
                {billingCycle === 'lifetime'
                  ? 'One-time purchase. No recurring charges.'
                  : `Subscription automatically renews ${billingCycle === 'monthly' ? 'monthly' : 'annually'} unless cancelled at least 24 hours before the end of the current period. Manage subscriptions in iOS Settings > Apple ID > Subscriptions.`}
              </p>
              <div className="flex items-center justify-center gap-3 text-xs">
                <Link href="/grow/terms" className="text-emerald-600 hover:text-emerald-700 underline">
                  Terms of Use
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/grow/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                  Privacy Policy
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            </div>
          )}

          {/* Feature Comparison */}
          <FeatureComparison />

          {/* Hardware Integrations */}
          <HardwareIntegrations />

          {/* FAQ */}
          <FAQ />

          {/* Back link */}
          <div className="text-center mt-8">
            <Link
              href="/grow"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              &larr; Back to Grow Daisy
            </Link>
          </div>
        </div>
      </div>
    </GrowLayout>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PricingCardProps {
  tier: GrowSubscriptionTier;
  currentTier: GrowSubscriptionTier;
  billingCycle: BillingCycle;
  price: string;
  savings: string | null;
  loading: boolean;
  onSubscribe: () => void;
  recommended?: boolean;
  features: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    highlight?: boolean;
  }>;
}

function PricingCard({
  tier,
  currentTier,
  billingCycle,
  price,
  savings,
  loading,
  onSubscribe,
  recommended,
  features,
}: PricingCardProps) {
  const tierInfo = GROW_TIERS[tier];
  const Icon = TIER_ICONS[tier];
  const isCurrentTier = currentTier === tier;
  const isDowngrade = compareTiers(currentTier, tier) > 0;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
        recommended ? 'ring-2 ring-emerald-500 scale-105' : ''
      }`}
    >
      {recommended && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-center py-1 text-sm font-medium">
          Most Popular
        </div>
      )}

      <div className={`p-6 ${recommended ? 'pt-10' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${recommended ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Icon className={`h-6 w-6 ${recommended ? 'text-emerald-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-lg">{getTierDisplayName(tier)}</h3>
            <p className="text-sm text-gray-500">{tierInfo.tagline}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{price}</span>
            {billingCycle !== 'lifetime' && (
              <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            )}
          </div>
          {savings && (
            <span className="inline-block mt-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              {savings}
            </span>
          )}
          {billingCycle === 'monthly' && tier !== 'orchard' && (
            <p className="text-xs text-gray-500 mt-1">7-day free trial</p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className={`flex items-center gap-2 text-sm ${
                feature.highlight ? 'text-emerald-700 font-medium' : 'text-gray-600'
              }`}
            >
              <feature.icon
                className={`h-4 w-4 shrink-0 ${
                  feature.highlight ? 'text-emerald-500' : 'text-gray-400'
                }`}
              />
              {feature.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onSubscribe}
          disabled={loading || isCurrentTier || isDowngrade}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isCurrentTier
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : isDowngrade
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : recommended
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : isCurrentTier ? (
            'Current Plan'
          ) : isDowngrade ? (
            'Contact Support'
          ) : (
            `Get ${getTierDisplayName(tier)}`
          )}
        </button>
      </div>
    </div>
  );
}

function FeatureComparison() {
  const features = [
    { name: 'Plant tracking', seed: '25', sprout: '75', bloom: 'Unlimited', harvest: 'Unlimited' },
    { name: 'AI Plant ID', seed: '5/mo', sprout: '20/mo', bloom: 'Unlimited', harvest: 'Unlimited' },
    { name: 'Pest diagnosis', seed: '2/mo', sprout: '10/mo', bloom: '30/mo', harvest: 'Unlimited' },
    { name: 'Weather forecast', seed: '3 days', sprout: '7 days', bloom: '14 days', harvest: '14 days' },
    { name: 'Soil temperature', seed: false, sprout: false, bloom: true, harvest: true },
    { name: 'Frost alerts', seed: false, sprout: false, bloom: true, harvest: true },
    { name: 'Weather threats', seed: false, sprout: false, bloom: true, harvest: true },
    { name: 'Smart watering', seed: false, sprout: false, bloom: true, harvest: true },
    { name: 'Hardware integrations', seed: false, sprout: true, bloom: true, harvest: true },
    { name: 'Yield predictions', seed: false, sprout: false, bloom: false, harvest: true },
    { name: 'AI Expert', seed: false, sprout: false, bloom: false, harvest: '2/mo' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-6 text-center">Compare Plans</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">Feature</th>
              <th className="text-center py-3 px-2">Seed</th>
              <th className="text-center py-3 px-2">Sprout</th>
              <th className="text-center py-3 px-2 bg-emerald-50">Bloom</th>
              <th className="text-center py-3 px-2">Harvest</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.name} className="border-b last:border-0">
                <td className="py-3 px-2 font-medium">{feature.name}</td>
                <td className="text-center py-3 px-2">
                  <FeatureValue value={feature.seed} />
                </td>
                <td className="text-center py-3 px-2">
                  <FeatureValue value={feature.sprout} />
                </td>
                <td className="text-center py-3 px-2 bg-emerald-50">
                  <FeatureValue value={feature.bloom} highlight />
                </td>
                <td className="text-center py-3 px-2">
                  <FeatureValue value={feature.harvest} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureValue({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className={`h-5 w-5 mx-auto ${highlight ? 'text-emerald-600' : 'text-green-500'}`} />
    ) : (
      <span className="text-gray-300">-</span>
    );
  }
  return (
    <span className={highlight ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
      {value}
    </span>
  );
}

function HardwareIntegrations() {
  const weatherStations = [
    {
      name: 'WeatherFlow Tempest',
      description: 'Premium all-in-one station',
      badge: 'Popular',
    },
    {
      name: 'Ambient Weather',
      description: 'Soil sensors supported',
      badge: 'Soil Sensors',
    },
    {
      name: 'Ecowitt',
      description: 'Affordable & feature-rich',
      badge: 'Best Value',
    },
    {
      name: 'Netatmo',
      description: 'Sleek European design',
      badge: 'Easy Setup',
    },
    {
      name: 'Davis WeatherLink',
      description: 'Professional-grade accuracy',
      badge: 'Pro',
    },
  ];

  const irrigationControllers = [
    {
      name: 'Rachio',
      description: 'Smart watering schedules',
      badge: 'Popular',
    },
    {
      name: 'Hunter Hydrawise',
      description: 'Professional irrigation',
      badge: 'Pro',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 mb-3">
          <Radio className="h-4 w-4" />
          <span className="text-sm font-medium">Sprout+ Feature</span>
        </div>
        <h2 className="text-xl font-bold">Connect Your Hardware</h2>
        <p className="text-gray-600 mt-2">
          Sync your weather station or irrigation controller for hyper-local garden intelligence
        </p>
      </div>

      {/* Weather Stations */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-gray-800">Weather Stations</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weatherStations.map((station) => (
            <div
              key={station.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div>
                <p className="font-medium text-gray-900">{station.name}</p>
                <p className="text-xs text-gray-500">{station.description}</p>
              </div>
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                {station.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Irrigation Controllers */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-gray-800">Irrigation Controllers</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {irrigationControllers.map((controller) => (
            <div
              key={controller.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div>
                <p className="font-medium text-gray-900">{controller.name}</p>
                <p className="text-xs text-gray-500">{controller.description}</p>
              </div>
              <span className="text-xs font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                {controller.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div>
            <Wifi className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Real-Time Sync</p>
            <p className="text-xs text-gray-500">Data updates automatically</p>
          </div>
          <div>
            <Thermometer className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Soil Sensors</p>
            <p className="text-xs text-gray-500">Temperature & moisture</p>
          </div>
          <div>
            <Droplets className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Smart Watering</p>
            <p className="text-xs text-gray-500">Weather-aware schedules</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const isiOS = Capacitor.getPlatform() === 'ios';

  const faqs = [
    {
      q: 'How does the free trial work?',
      a: 'Monthly subscriptions include a 7-day free trial. You can cancel anytime during the trial and won\'t be charged. Annual and lifetime purchases don\'t have trials but offer significant savings.',
    },
    {
      q: 'What makes Bloom special?',
      a: 'Bloom includes our weather moats - features no other gardening app has: soil temperature at 4 depths, 48-hour frost alerts, weather-based pest warnings, wind-aware task scheduling, and smart watering recommendations.',
    },
    {
      q: 'Can I upgrade or downgrade later?',
      a: isiOS
        ? 'Yes! You can manage your subscription in iOS Settings > Apple ID > Subscriptions. Changes take effect at the end of your current billing period.'
        : 'Yes! You can upgrade anytime and only pay the difference. To downgrade, contact support - you\'ll keep your current tier until the end of your billing period.',
    },
    {
      q: 'What payment methods do you accept?',
      a: isiOS
        ? 'Payments are processed securely through Apple\'s App Store using your Apple ID payment method.'
        : 'We accept all major credit and debit cards through Stripe\'s secure payment processing. Apple Pay and Google Pay are also supported.',
    },
    {
      q: 'Is there a family plan?',
      a: 'Harvest tier includes team sharing for up to 5 family members. Each member gets their own login but shares the garden data.',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
      <div className="space-y-4 max-w-2xl mx-auto">
        {faqs.map((faq, idx) => (
          <details key={idx} className="bg-white rounded-lg shadow group">
            <summary className="px-4 py-3 font-medium cursor-pointer list-none flex justify-between items-center">
              {faq.q}
              <span className="text-gray-400 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="px-4 pb-4 text-gray-600 text-sm">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

// Helper
function compareTiers(a: GrowSubscriptionTier, b: GrowSubscriptionTier): number {
  const order: GrowSubscriptionTier[] = ['seed', 'sprout', 'bloom', 'harvest', 'orchard'];
  return order.indexOf(a) - order.indexOf(b);
}
