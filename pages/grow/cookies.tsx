import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowCookiePolicy() {
  const lastUpdated = 'April 2026';

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
              <h2 className="text-xl font-semibold mb-4">3. Cookies We Use</h2>
              <p className="mb-4">
                The table below lists the cookies Grow Daisy sets or relies on, together with
                their purpose and how long they remain on your device.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 border border-gray-200 font-semibold">Cookie / Key</th>
                      <th className="text-left p-3 border border-gray-200 font-semibold">Type</th>
                      <th className="text-left p-3 border border-gray-200 font-semibold">Purpose</th>
                      <th className="text-left p-3 border border-gray-200 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-gray-200 font-mono text-xs">sb-*-auth-token</td>
                      <td className="p-3 border border-gray-200">Essential</td>
                      <td className="p-3 border border-gray-200">Keeps you logged in (Supabase authentication session)</td>
                      <td className="p-3 border border-gray-200">Session / 7 days</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-200 font-mono text-xs">grow_preferences</td>
                      <td className="p-3 border border-gray-200">Functional</td>
                      <td className="p-3 border border-gray-200">Stores your garden location, units, and display preferences</td>
                      <td className="p-3 border border-gray-200">1 year</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-200 font-mono text-xs">grow_language</td>
                      <td className="p-3 border border-gray-200">Functional</td>
                      <td className="p-3 border border-gray-200">Remembers your chosen language</td>
                      <td className="p-3 border border-gray-200">1 year</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-200 font-mono text-xs">__stripe_mid / __stripe_sid</td>
                      <td className="p-3 border border-gray-200">Essential (payments)</td>
                      <td className="p-3 border border-gray-200">Fraud prevention and payment session management (Stripe)</td>
                      <td className="p-3 border border-gray-200">1 year / session</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-200 font-mono text-xs">_vercel_insights</td>
                      <td className="p-3 border border-gray-200">Analytics (optional)</td>
                      <td className="p-3 border border-gray-200">Anonymous page-view analytics to improve the app. Only set with your consent.</td>
                      <td className="p-3 border border-gray-200">1 year</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-200 font-mono text-xs">_GRECAPTCHA</td>
                      <td className="p-3 border border-gray-200">Essential (security)</td>
                      <td className="p-3 border border-gray-200">Google reCAPTCHA — prevents automated abuse of the service</td>
                      <td className="p-3 border border-gray-200">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                We keep this list up to date. If we add new cookies we will update this policy and, where required, ask for your consent again.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. What We Don&apos;t Do</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>We don&apos;t use advertising cookies or trackers</li>
                <li>We don&apos;t share cookie data with advertisers</li>
                <li>We don&apos;t track you across other websites</li>
                <li>We don&apos;t sell cookie data to anyone</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Managing and Withdrawing Consent</h2>
              <p className="mb-3">
                You can change your cookie preferences at any time. You gave (or declined) consent for
                optional analytics cookies when you first opened Grow Daisy. To change that choice:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>In the app:</strong> Go to Settings &rarr; Privacy &rarr; Cookie Preferences.
                  You can withdraw analytics consent or re-grant it here at any time.
                </li>
                <li>
                  <strong>Via your browser:</strong> Most browsers let you view, block, or delete cookies
                  through their privacy settings. Blocking cookies may affect how the app works.
                </li>
                <li>
                  <strong>On mobile:</strong> Use your device&apos;s app privacy settings (iOS: Settings &rarr;
                  Privacy &amp; Security; Android: Settings &rarr; Apps &rarr; Grow Daisy &rarr; Permissions).
                </li>
              </ul>
              <p className="mt-3 text-sm text-gray-500">
                Withdrawing consent does not affect the lawfulness of processing based on consent before withdrawal.
                Essential and payment cookies cannot be disabled without preventing core functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Third-Party Cookies</h2>
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
              <h2 className="text-xl font-semibold mb-4">7. Updates to This Policy</h2>
              <p>
                We may update this cookie policy as we add new features. Check back periodically for
                changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. More Information</h2>
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
