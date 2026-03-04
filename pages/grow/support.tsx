import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Mail, HelpCircle, CreditCard, Shield, UserX, Settings, Loader2, ExternalLink } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import { getTierDisplayName } from '@/lib/grow/subscription';
import { createClient } from '@/lib/supabase/client';

export default function GrowSupportPage() {
  const { tier, subscription, isLoading } = useGrowSubscription();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const isPaidTier = tier !== 'seed';
  const subscriptionType = subscription?.subscriptionType;
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const supabase = createClient();

  const handleManageSubscription = async () => {
    if (isIOS) {
      // Deep link to iOS subscription settings
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
      return;
    }

    // Web: open Stripe Customer Portal
    try {
      setPortalLoading(true);
      setPortalError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPortalError('Please sign in to manage your subscription.');
        return;
      }

      const response = await fetch('/api/grow/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open subscription portal');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
      setPortalError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <GrowLayout>
      <Head>
        <title>Support - Grow Daisy</title>
        <meta name="description" content="Get help with Grow Daisy - Weather-Smart Gardening" />
      </Head>

      <main className="min-h-screen bg-white pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/grow" className="inline-flex items-center gap-2 text-emerald-600 mb-6 hover:underline">
            <ArrowLeft size={20} />
            Back to Grow Daisy
          </Link>

          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-gray-500 mb-8">We&apos;re here to help you get the most out of Grow Daisy.</p>

          <div className="prose prose-lg max-w-none text-gray-800">
            {/* Subscription Management */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                Manage Subscription
              </h2>

              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subscription info...
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 not-prose">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Current plan: <span className="text-emerald-600">{getTierDisplayName(tier)}</span>
                      </p>
                      {isPaidTier && subscriptionType && (
                        <p className="text-sm text-gray-500">
                          Billing: {subscriptionType === 'lifetime' ? 'Lifetime (one-time)' : subscriptionType}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/grow/premium"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      View plans
                    </Link>
                  </div>

                  {isPaidTier && (
                    <>
                      <button
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {isIOS
                          ? 'Manage in iOS Settings'
                          : portalLoading
                          ? 'Opening...'
                          : 'Manage Subscription'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        {isIOS
                          ? 'You can change your plan, cancel, or view billing history in iOS Settings > Apple ID > Subscriptions.'
                          : 'Change your plan, update payment method, or cancel via the Stripe billing portal.'}
                      </p>
                    </>
                  )}

                  {!isPaidTier && (
                    <p className="text-sm text-gray-500">
                      You&apos;re on the free Seed plan.{' '}
                      <Link href="/grow/premium" className="text-emerald-600 underline">
                        Upgrade to unlock premium features
                      </Link>.
                    </p>
                  )}

                  {portalError && (
                    <p className="text-sm text-red-600 mt-2">{portalError}</p>
                  )}
                </div>
              )}
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Contact Us
              </h2>
              <p className="mb-2">
                For any questions, feedback, or issues, please email us at:{' '}
                <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">
                  hello@godaisy.io
                </a>
              </p>
              <p className="text-sm text-gray-500">We aim to respond within 48 hours.</p>
            </section>

            {/* FAQ */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-600" />
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    How do subscriptions work?
                  </h3>
                  <p className="text-sm">
                    Grow Daisy offers monthly, annual, and lifetime premium plans. Depending on your
                    platform, subscriptions are handled by Stripe (web) or Apple (iOS).
                    Subscriptions auto-renew unless cancelled before the end of the current
                    billing period.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    How do I downgrade my plan?
                  </h3>
                  <p className="text-sm">
                    <strong>iOS:</strong> Go to Settings &gt; Apple ID &gt; Subscriptions &gt; Grow Daisy.
                    Select the plan you&apos;d like to switch to. The change takes effect at the end of your
                    current billing period.<br />
                    <strong>Web:</strong> Use the &quot;Manage Subscription&quot; button above to open the billing
                    portal where you can change or cancel your plan. You&apos;ll keep your current tier until
                    the end of your billing period.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    Can I get a refund?
                  </h3>
                  <p className="text-sm">
                    <strong>iOS:</strong> Refunds are handled by Apple. Visit{' '}
                    <a href="https://reportaproblem.apple.com" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">
                      reportaproblem.apple.com
                    </a>
                    {' '}to request a refund.<br />
                    <strong>Web:</strong> Contact us at{' '}
                    <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">hello@godaisy.io</a>
                    {' '}and we&apos;ll sort it out.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    How is my data handled?
                  </h3>
                  <p className="text-sm">
                    We only collect the data needed to provide personalised gardening recommendations
                    (location, garden preferences, plant data). We do not sell your data or use it for
                    advertising. For full details, see our{' '}
                    <Link href="/grow/privacy" className="text-emerald-600 underline">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <UserX className="h-4 w-4 text-gray-400" />
                    How do I delete my account?
                  </h3>
                  <p className="text-sm">
                    You can delete your account and all associated data at any time from the Settings
                    page in the app. Tap &quot;Delete Account&quot; and confirm by typing DELETE. This
                    action is permanent and cannot be undone.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    What weather data do you use?
                  </h3>
                  <p className="text-sm">
                    Grow Daisy uses data from OpenWeather and other meteorological services to provide
                    accurate forecasts, frost alerts, and soil temperature estimates for your garden
                    location. Weather data is refreshed regularly to keep recommendations up to date.
                  </p>
                </div>
              </div>
            </section>

            {/* Links */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Legal</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <Link href="/grow/privacy" className="text-emerald-600 underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/grow/terms" className="text-emerald-600 underline">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </section>

            <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Grow Daisy is part of the Daisy app family by{' '}
                <a href="https://godaisy.io" className="text-emerald-600 underline">
                  godaisy.io
                </a>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Email:{' '}
                <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">
                  hello@godaisy.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </GrowLayout>
  );
}
