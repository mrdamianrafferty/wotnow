import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowPrivacyPolicy() {
  const lastUpdated = 'February 2026';

  return (
    <GrowLayout>
      <Head>
        <title>Privacy Policy - Grow Daisy</title>
        <meta name="description" content="Privacy Policy for Grow Daisy - Weather-Smart Gardening" />
      </Head>

      <main className="min-h-screen bg-white pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/grow" className="inline-flex items-center gap-2 text-emerald-600 mb-6 hover:underline">
            <ArrowLeft size={20} />
            Back to Grow Daisy
          </Link>

          <h1 className="text-3xl font-bold mb-2">Grow Daisy Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-lg max-w-none text-gray-800">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. What Data We Collect</h2>
              <p className="mb-2">Grow Daisy collects only the data needed to provide personalised gardening recommendations:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information (email address) when you create an account</li>
                <li>Garden location and preferences (soil type, sun exposure, interests)</li>
                <li>Plant data, garden photos, and growing notes you add</li>
                <li>Weather and soil condition data for your location</li>
                <li>Push notification tokens for garden reminders (if enabled)</li>
                <li>Usage analytics to improve the app (anonymous)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Location Privacy</h2>
              <p>
                We use your garden location to provide accurate weather forecasts, soil temperature data,
                frost alerts, and planting calendar recommendations. Location data is only collected when
                you grant permission and is used solely for providing relevant gardening guidance.
                You can change or remove your location at any time in Settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Data</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide personalised planting calendars and weather-smart task recommendations</li>
                <li>Send push notifications for frost alerts, watering reminders, and garden care tips</li>
                <li>Display soil temperature, weather forecasts, and growing conditions for your area</li>
                <li>Sync your garden data across devices (if logged in)</li>
                <li>Improve our algorithms and features (anonymously)</li>
              </ul>
              <p className="mt-2">We do not sell or share your data for advertising.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Garden Photos</h2>
              <p>
                Photos you upload (plant identification, garden logs) are stored securely and are only
                visible to you. Photos may be processed by our AI plant identification service to
                provide species identification and health diagnosis. We do not share your photos
                with third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Services</h2>
              <p className="mb-2">Grow Daisy uses these third-party services:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase</strong> - Database and authentication (GDPR-compliant)</li>
                <li><strong>Google Maps</strong> - Location search and mapping</li>
                <li><strong>OpenWeather</strong> - Weather forecast data</li>
                <li><strong>Stripe</strong> - Secure payment processing for premium subscriptions</li>
                <li><strong>Firebase</strong> - Push notifications delivery</li>
              </ul>
              <p className="mt-2">Each service has its own privacy policy and security measures.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Storage and Security</h2>
              <p>
                Your data is stored securely using industry-standard encryption. We use GDPR-compliant
                hosting providers. All data transmission uses HTTPS/TLS encryption, and user data is
                protected by row-level security policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Your Rights (GDPR)</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access</strong> - See what data we have about you</li>
                <li><strong>Correct</strong> - Fix any incorrect information</li>
                <li><strong>Delete</strong> - Remove your account and all associated data from Settings</li>
                <li><strong>Export</strong> - Download your data in a portable format</li>
                <li><strong>Object</strong> - Stop us from processing your data</li>
              </ul>
              <p className="mt-2">
                Contact us at{' '}
                <a href="mailto:privacy@godaisy.io" className="text-emerald-600 underline">
                  privacy@godaisy.io
                </a>{' '}
                to exercise any of these rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
              <p>
                Grow Daisy is not intended for children under 13. We do not knowingly collect
                data from children. If you believe we have collected data from a child, please
                contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this policy occasionally. Significant changes will be communicated
                via the app or email. Continued use after changes means you accept the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Shared Privacy Policy</h2>
              <p>
                Grow Daisy is part of the Daisy app family. For additional details on data handling
                common to all our apps, see the{' '}
                <Link href="/privacy" className="text-emerald-600 underline">
                  shared privacy policy
                </Link>.
              </p>
            </section>

            <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
              <p className="text-sm text-gray-600 mt-1">
                Questions? Contact us at{' '}
                <a href="mailto:privacy@godaisy.io" className="text-emerald-600 underline">
                  privacy@godaisy.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </GrowLayout>
  );
}
