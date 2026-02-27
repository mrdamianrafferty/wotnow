import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowCookiePolicy() {
  const lastUpdated = 'February 2026';

  return (
    <GrowLayout>
      <Head>
        <title>Cookie Policy - Grow Daisy</title>
        <meta name="description" content="Cookie Policy for Grow Daisy - Weather-Smart Gardening" />
      </Head>

      <main className="min-h-screen bg-white pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/grow" className="inline-flex items-center gap-2 text-emerald-600 mb-6 hover:underline">
            <ArrowLeft size={20} />
            Back to Grow Daisy
          </Link>

          <h1 className="text-3xl font-bold mb-2">Grow Daisy Cookie Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-lg max-w-none text-gray-800">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files stored on your device when you use Grow Daisy. They help
                us remember your preferences, keep you logged in, and understand how you use the app.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. How We Use Cookies</h2>

              <h3 className="text-lg font-medium mb-2">Essential Cookies (Always On)</h3>
              <p className="mb-4">
                These cookies are necessary for Grow Daisy to work properly. They remember your login
                session, preferences, and selected garden location.
              </p>

              <h3 className="text-lg font-medium mb-2">Functional Cookies</h3>
              <p className="mb-4">
                These help personalise your experience — remembering your garden preferences, display
                settings, and recently viewed plants.
              </p>

              <h3 className="text-lg font-medium mb-2">Analytics Cookies (Optional)</h3>
              <p>
                If you consent, we use anonymous analytics to understand which features are popular
                and how to improve Grow Daisy. No personal data is collected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. What We Don&apos;t Do</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>We don&apos;t use advertising cookies or trackers</li>
                <li>We don&apos;t share cookie data with advertisers</li>
                <li>We don&apos;t track you across other websites</li>
                <li>We don&apos;t sell cookie data to anyone</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Managing Your Cookies</h2>
              <p>You can control cookies through:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>The consent banner when you first use Grow Daisy</li>
                <li>Your browser settings (most browsers let you block or delete cookies)</li>
                <li>Your device settings (for mobile apps)</li>
              </ul>
              <p className="mt-2 text-gray-500 text-sm">
                Note: Blocking essential cookies will prevent Grow Daisy from working properly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Cookies</h2>
              <p>Some features use third-party services that may set their own cookies:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Google Maps</strong> — Location search and map display</li>
                <li><strong>Supabase</strong> — Authentication and data storage</li>
                <li><strong>OpenWeather</strong> — Weather data services</li>
                <li><strong>Stripe</strong> — Secure payment processing for premium subscriptions</li>
                <li><strong>Vercel Analytics</strong> — Anonymous usage analytics</li>
              </ul>
              <p className="mt-2">
                These services have their own cookie policies independent of Grow Daisy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Updates to This Policy</h2>
              <p>
                We may update this cookie policy as we add new features. Check back periodically for
                changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. More Information</h2>
              <p>
                For full details on how we handle your data, see our{' '}
                <Link href="/grow/privacy" className="text-emerald-600 underline">
                  Privacy Policy
                </Link>.
              </p>
            </section>

            <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
              <p className="text-sm text-gray-600 mt-1">
                Questions? Contact us at{' '}
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
