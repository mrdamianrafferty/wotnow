/**
 * Go Daisy+ Checkout Page
 *
 * Shows pricing (monthly/annual), feature comparison, and checkout flow.
 * iOS: RevenueCat In-App Purchase. Web: Stripe Checkout.
 * Cross-sell cards for Grow Daisy + Findr at bottom.
 *
 * @module pages/godaisy-plus
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Capacitor } from '@capacitor/core';
import Head from 'next/head';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  Lock,
  Sun,
  CloudRain,
  Bell,
  Calendar,
  Users,
  Compass,
  Binoculars,
  Waves,
  Loader2,
  RotateCcw,
  ChevronDown,
  X,
} from 'lucide-react';
import { useGoDaisySubscription } from '@/hooks/useGoDaisySubscription';
import { supabase } from '@/lib/supabase/client';
import {
  GODAISY_PRICING,
  formatPrice,
} from '@/lib/godaisy/subscription';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/footer';

type BillingCycle = 'monthly' | 'annual';

export default function GoDaisyPlusPage() {
  const router = useRouter();
  const { isPaid, isLoading, refetch } = useGoDaisySubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  // iOS IAP state
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [restoring, setRestoring] = useState(false);
  const [activating, setActivating] = useState(false);

  // Check for cancelled checkout redirect
  useEffect(() => {
    if (router.query.canceled === 'true') {
      setError('Checkout was cancelled. You can try again when you\'re ready.');
    }
  }, [router.query.canceled]);

  /**
   * Handle iOS In-App Purchase via RevenueCat
   */
  const handleIOSPurchase = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/godaisy-plus');
        return;
      }

      const productId = billingCycle === 'annual'
        ? 'godaisy_plus_annual'
        : 'godaisy_plus_monthly';

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logIn({ appUserID: user.id });

      const { products } = await Purchases.getProducts({
        productIdentifiers: [productId],
      });

      if (!products.length) {
        setError('This plan is not available right now. Please try again later.');
        return;
      }

      const result = await Purchases.purchaseStoreProduct({ product: products[0] });
      if (result.customerInfo) {
        setActivating(true);
        // Give webhook time to update Supabase
        await new Promise(r => setTimeout(r, 3000));
        await refetch();
        setActivating(false);
      }
    } catch (err: unknown) {
      const error = err as { userCancelled?: boolean; message?: string };
      if (!error.userCancelled) {
        console.error('[godaisy+] iOS purchase error:', err);
        setError(error.message || 'Purchase failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [billingCycle, router, refetch]);

  /**
   * Restore previous purchases (Apple requirement)
   */
  const handleRestore = async () => {
    try {
      setRestoring(true);
      setError('');

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.restorePurchases();
      await refetch();
    } catch (err) {
      console.error('[godaisy+] Restore error:', err);
      setError('Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Handle web Stripe checkout
   */
  const handleCheckout = useCallback(async () => {
    if (isIOS) {
      return handleIOSPurchase();
    }

    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login?redirect=/godaisy-plus');
        return;
      }

      const response = await fetch('/api/godaisy/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          billingType: billingCycle,
          promoCode: promoCode.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout via session URL (preferred over deprecated redirectToCheckout)
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[godaisy+] Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }, [billingCycle, promoCode, isIOS, router, handleIOSPurchase]);

  // Monthly price, annual price, savings
  const monthlyPrice = formatPrice(GODAISY_PRICING.monthly.amount);
  const annualPrice = formatPrice(GODAISY_PRICING.annual.amount);
  const annualMonthly = formatPrice(GODAISY_PRICING.annual.amount / 12);
  const savingsPercent = Math.round(
    ((GODAISY_PRICING.monthly.amount * 12 - GODAISY_PRICING.annual.amount) /
      (GODAISY_PRICING.monthly.amount * 12)) *
      100
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="loading loading-spinner loading-lg text-cyan-600" />
      </div>
    );
  }

  if (activating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-cyan-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Activating Go Daisy+</h2>
          <p className="text-gray-600">
            Your subscription is being activated. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" data-theme="light">
      <Head>
        <title>Go Daisy+ - Unlock the Full Experience</title>
        <meta name="description" content="Upgrade to Go Daisy+ for unlimited outdoor activities, 14-day forecasts, coastal data, and more." />
      </Head>

      <AppHeader />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Go Daisy+</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Your weather. Your way.
            </h1>
            <p className="text-lg text-cyan-100 max-w-xl mx-auto">
              Unlock unlimited activities, extended forecasts, coastal data, and smart notifications.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 -mt-6 pb-12">
          {/* Already subscribed banner */}
          {isPaid && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-cyan-800 font-medium">
                You&apos;re already on Go Daisy+! Manage your subscription in{' '}
                <Link href="/account" className="underline">Account settings</Link>.
              </p>
            </div>
          )}

          {/* Billing toggle */}
          {!isPaid && (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-white rounded-full p-1 shadow-lg inline-flex">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-600 hover:text-cyan-600'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'annual'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-600 hover:text-cyan-600'
                    }`}
                  >
                    Annual
                    <span className="ml-1 text-xs opacity-80">Save {savingsPercent}%</span>
                  </button>
                </div>
              </div>

              {/* Pricing card */}
              <div className="bg-white rounded-2xl shadow-lg border border-cyan-100 overflow-hidden mb-8">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Go Daisy+</h2>
                      <p className="text-sm text-gray-500 mt-1">Full access to everything</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">
                        {billingCycle === 'annual' ? annualPrice : monthlyPrice}
                      </div>
                      <div className="text-sm text-gray-500">
                        {billingCycle === 'annual' ? '/year' : '/month'}
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-xs text-cyan-600 font-medium mt-1">
                          Just {annualMonthly}/month
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <FeatureItem icon={Sun} text="Unlimited outdoor activities" />
                    <FeatureItem icon={Calendar} text="14-day forecast" />
                    <FeatureItem icon={Waves} text="Coastal location" />
                    <FeatureItem icon={Bell} text="Smart notifications" />
                    <FeatureItem icon={Binoculars} text="Astronomy alerts" />
                    <FeatureItem icon={CloudRain} text="Pollen, soil & pressure" />
                    <FeatureItem icon={Users} text="Social features" />
                    <FeatureItem icon={Compass} text="Activity journal" />
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                    {loading ? 'Processing...' : 'Upgrade to Plus'}
                  </button>
                </div>
              </div>

              {/* Promo code — hidden on iOS */}
              {!isIOS && (
                <div className="max-w-md mx-auto mb-6">
                  {!promoOpen ? (
                    <button
                      onClick={() => setPromoOpen(true)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-600 mx-auto"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Have a promo code?
                    </button>
                  ) : (
                    <div className="bg-white rounded-lg p-4 shadow border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Promo code</label>
                        <button onClick={() => { setPromoOpen(false); setPromoCode(''); }} className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter code"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-gray-900"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Restore Purchases — iOS only */}
              {isIOS && (
                <div className="max-w-md mx-auto mb-4 text-center">
                  <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
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

              {/* iOS subscription disclosure (Apple Guideline 3.1.2) */}
              {isIOS && (
                <div className="max-w-md mx-auto mb-6 text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Subscription automatically renews{' '}
                    {billingCycle === 'monthly' ? 'monthly' : 'annually'} unless cancelled at
                    least 24 hours before the end of the current period. Manage subscriptions
                    in iOS Settings &gt; Apple ID &gt; Subscriptions.
                  </p>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <Link href="/terms" className="text-cyan-600 hover:text-cyan-700 underline">
                      Terms of Use
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/privacy" className="text-cyan-600 hover:text-cyan-700 underline">
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            </div>
          )}

          {/* Feature comparison */}
          <FeatureComparisonTable />

          {/* Cross-sell */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
              Explore the family
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <CrossSellCard
                title="Grow Daisy"
                description="Weather-smart gardening with soil temp, frost alerts, and planting advice."
                href="/grow/premium"
                color="emerald"
              />
              <CrossSellCard
                title="Findr"
                description="AI-powered sea fishing predictions using real marine data."
                href="/findr"
                color="blue"
              />
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-8">
            <Link href="/" className="text-cyan-600 hover:text-cyan-700 font-medium">
              &larr; Back to Go Daisy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function FeatureItem({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-cyan-600" />
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

function FeatureComparisonTable() {
  const features = [
    { name: 'Indoor activities', free: true, plus: true },
    { name: 'Outdoor activities', free: '6 max', plus: 'Unlimited' },
    { name: 'Forecast days', free: '3 days', plus: '14 days' },
    { name: 'UV & Air Quality', free: true, plus: true },
    { name: 'Extreme weather alerts', free: true, plus: true },
    { name: 'Coastal location', free: false, plus: true },
    { name: 'Pollen & pressure data', free: false, plus: true },
    { name: 'Astronomy alerts', free: false, plus: true },
    { name: 'Smart notifications', free: false, plus: true },
    { name: 'Social features', free: false, plus: true },
    { name: 'Activity journal', free: false, plus: true },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Free vs Plus</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Feature</th>
                <th className="text-center py-2 px-2 font-medium text-gray-600 w-20">Free</th>
                <th className="text-center py-2 pl-2 font-medium text-cyan-600 w-20">Plus</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.name} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4 text-gray-700">{feature.name}</td>
                  <td className="py-2.5 px-2 text-center">
                    <CellValue value={feature.free} />
                  </td>
                  <td className="py-2.5 pl-2 text-center">
                    <CellValue value={feature.plus} plus />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CellValue({ value, plus }: { value: boolean | string; plus?: boolean }) {
  if (typeof value === 'string') {
    return <span className={`text-xs font-medium ${plus ? 'text-cyan-600' : 'text-gray-600'}`}>{value}</span>;
  }
  if (value) {
    return <Check className={`h-4 w-4 mx-auto ${plus ? 'text-cyan-600' : 'text-gray-400'}`} />;
  }
  return <Lock className="h-4 w-4 mx-auto text-gray-300" />;
}

function CrossSellCard({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: 'emerald' | 'blue';
}) {
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    blue: 'border-blue-200 bg-blue-50 hover:border-blue-300',
  };
  const textColors = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
  };

  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition-colors ${colors[color]}`}
    >
      <h4 className={`font-semibold ${textColors[color]} mb-1`}>{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
