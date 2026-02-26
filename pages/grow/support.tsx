import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Mail, HelpCircle, CreditCard, Shield, UserX } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowSupportPage() {
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
                    platform, subscriptions are handled by Stripe (web), Apple (iOS), or Google Play
                    (Android). Subscriptions auto-renew unless cancelled before the end of the current
                    billing period. You can manage or cancel your subscription at any time through your
                    platform&apos;s subscription settings.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    How do I manage or cancel my subscription?
                  </h3>
                  <p className="text-sm">
                    <strong>Web (Stripe):</strong> Go to Settings in the app and manage your subscription
                    from the Subscription card.<br />
                    <strong>iOS:</strong> Go to your device&apos;s Settings &gt; Apple ID &gt; Subscriptions.<br />
                    <strong>Android:</strong> Open Google Play &gt; Payments &amp; subscriptions &gt; Subscriptions.
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
