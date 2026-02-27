import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
  const lastUpdated = 'February 2026';

  return (
    <>
      <Head>
        <title>Cookie Policy - Go Daisy</title>
        <meta name="description" content="Cookie Policy for Go Daisy - Weather-Informed Outdoor Activity Recommendations" />
      </Head>

      <main className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-2 text-primary mb-6 hover:underline">
            <ArrowLeft size={20} />
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Go Daisy Cookie Policy</h1>
          <p className="text-base-content/60 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files stored on your device when you use Go Daisy. They help us
                remember your preferences, keep you logged in, and understand how you use the app.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. How We Use Cookies</h2>

              <h3 className="text-lg font-medium mb-2">Essential Cookies (Always On)</h3>
              <p className="mb-4">
                These cookies are necessary for Go Daisy to work properly. They remember your login
                session, preferences, and selected locations.
              </p>

              <h3 className="text-lg font-medium mb-2">Functional Cookies</h3>
              <p className="mb-4">
                These help personalise your experience — remembering your display preferences,
                recently viewed locations, and activity interests.
              </p>

              <h3 className="text-lg font-medium mb-2">Analytics Cookies (Optional)</h3>
              <p>
                If you consent, we use anonymous analytics to understand which features are popular
                and how to improve Go Daisy. No personal data is collected.
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
                <li>The consent banner when you first use Go Daisy</li>
                <li>Your browser settings (most browsers let you block or delete cookies)</li>
                <li>Your device settings (for mobile apps)</li>
              </ul>
              <p className="mt-2 text-base-content/60 text-sm">
                Note: Blocking essential cookies will prevent Go Daisy from working properly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Cookies</h2>
              <p>Some features use third-party services that may set their own cookies:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Google Maps</strong> — Location search and map display</li>
                <li><strong>Supabase</strong> — Authentication and data storage</li>
                <li><strong>OpenWeather</strong> — Weather data services</li>
                <li><strong>Vercel Analytics</strong> — Anonymous usage analytics</li>
              </ul>
              <p className="mt-2">
                These services have their own cookie policies independent of Go Daisy.
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
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>.
              </p>
            </section>

            <div className="mt-8 p-4 bg-base-200 rounded-lg">
              <p className="text-sm text-base-content/60">Last updated: {lastUpdated}</p>
              <p className="text-sm text-base-content/60 mt-1">
                Questions? Contact us at{' '}
                <a href="mailto:hello@godaisy.io" className="text-primary underline">
                  hello@godaisy.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
