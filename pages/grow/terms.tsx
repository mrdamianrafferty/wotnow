import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowTermsOfService() {
  const lastUpdated = 'April 2026';

  return (
    <GrowLayout>
      <Head>
        <title>Terms of Service - Grow Daisy</title>
        <meta name="description" content="Terms of Service for Grow Daisy - Weather-Smart Gardening" />
      </Head>

      <main className="min-h-screen bg-white pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/grow" className="inline-flex items-center gap-2 text-emerald-600 mb-6 hover:underline">
            <ArrowLeft size={20} />
            Back to Grow Daisy
          </Link>

          <h1 className="text-3xl font-bold mb-2">Grow Daisy Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-lg max-w-none text-gray-800">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. About Grow Daisy</h2>
              <p>
                Grow Daisy (&quot;the App&quot;) is a weather-smart gardening assistant provided by
                Daisy Apps (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using the App you
                agree to these Terms of Service. If you do not agree, please do not use the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Use of the Service</h2>
              <p className="mb-2">You may use Grow Daisy to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Receive weather-informed gardening recommendations and planting calendars</li>
                <li>Track your garden plants, photos, and growing notes</li>
                <li>Receive frost alerts and weather-based task suggestions</li>
                <li>Use AI-powered plant identification and health diagnosis</li>
              </ul>
              <p className="mt-2">
                You must be at least 13 years old to create an account. You are responsible for
                maintaining the security of your account credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Garden Data</h2>
              <p>
                Garden data you enter (plants, photos, notes, preferences) belongs to you. We store
                it to provide the service and sync across your devices. You can delete your data at
                any time by deleting your account in Settings. See our{' '}
                <Link href="/grow/privacy" className="text-emerald-600 underline">
                  Privacy Policy
                </Link>{' '}
                for full details on data handling.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. AI Plant Identification</h2>
              <p>
                Grow Daisy includes AI-powered plant identification and health diagnosis features.
                These are provided as guidance only and should not be relied upon for safety-critical
                decisions. We do not guarantee the accuracy of AI identifications. Never consume a
                plant based solely on an AI identification. If in doubt, consult a qualified botanist
                or horticulturist.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Subscriptions and In-App Purchases</h2>
              <p className="mb-2">
                Grow Daisy offers premium features via subscription plans:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Monthly</strong> &mdash; auto-renews each month</li>
                <li><strong>Annual</strong> &mdash; auto-renews each year</li>
                <li><strong>Lifetime</strong> &mdash; one-time purchase, no renewal</li>
              </ul>
              <p className="mt-4 mb-2">
                Subscriptions may be purchased through the web (via Stripe), the Apple App Store
                (iOS), or Google Play (Android). The billing provider depends on the platform you
                use to subscribe.
              </p>
              <p className="mt-4 mb-2"><strong>Billing:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Payment is charged at confirmation of purchase via your chosen platform</li>
                <li>Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period</li>
                <li>You can manage and cancel subscriptions through your platform&apos;s subscription settings</li>
              </ul>
              <p className="mt-4 mb-2"><strong>Free trial:</strong></p>
              <p>
                Where a free trial is available, you will be informed of the trial duration and the
                price that applies when the trial ends. The unused portion of the free trial is
                forfeited when you purchase a paid subscription during the trial period.
              </p>
              <p className="mt-4 mb-2"><strong>Data processing (billing):</strong></p>
              <p>
                When you purchase a subscription via Stripe, we process your billing information
                (name, email address, payment method details) to fulfil and manage your subscription.
                This processing is necessary for the performance of our contract with you
                (Article&nbsp;6(1)(b) GDPR). See our{' '}
                <Link href="/grow/privacy" className="text-emerald-600 underline">
                  Privacy Policy
                </Link>{' '}
                for full details.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Cancellation and Refunds</h2>
              <p className="mb-2">
                You may cancel your subscription at any time. Upon cancellation:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You retain access to premium features until the end of your current billing period</li>
                <li>No further charges will be made after the current period ends</li>
                <li>Your account reverts to the free tier when the paid period expires</li>
              </ul>
              <p className="mt-4 mb-2"><strong>How to cancel:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Web (Stripe):</strong> Manage your subscription from Settings in the app</li>
                <li><strong>iOS:</strong> Device Settings &gt; Apple ID &gt; Subscriptions</li>
                <li><strong>Android:</strong> Google Play &gt; Payments &amp; subscriptions &gt; Subscriptions</li>
              </ul>
              <p className="mt-4 mb-2"><strong>Refunds:</strong></p>
              <p>
                Refunds for purchases made via the Apple App Store or Google Play are handled by the
                respective platform in accordance with their refund policies. For web (Stripe)
                purchases, contact us at{' '}
                <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">
                  hello@godaisy.io
                </a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. EU Right of Withdrawal</h2>
              <p className="mb-2">
                If you are a consumer in the European Union or United Kingdom, you have the right to
                withdraw from a purchase within <strong>14 calendar days</strong> of the transaction
                without giving any reason (the &quot;cooling-off period&quot;).
              </p>
              <p className="mb-2">
                <strong>Waiver for immediately-commenced digital services:</strong> When you purchase
                a subscription or lifetime plan and the service starts immediately (for example, your
                premium features are activated straight away), you expressly request that performance
                begins before the cooling-off period expires. By confirming your purchase you
                acknowledge that your right of withdrawal is thereby lost once the service has fully
                commenced, in accordance with Article&nbsp;16(m) of the EU Consumer Rights Directive.
              </p>
              <p>
                If the service has not yet started you may still withdraw within 14 days by contacting
                us at{' '}
                <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">
                  hello@godaisy.io
                </a>{' '}
                with the subject line &quot;Right of Withdrawal&quot;. We will process your request
                and confirm by email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Account Deletion</h2>
              <p>
                You can permanently delete your account and all associated data at any time from the
                Settings page. Deletion is irreversible. If you have an active subscription, deleting
                your account does not automatically cancel it &mdash; please cancel your subscription
                separately through your billing platform to avoid future charges.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Weather and Recommendation Accuracy</h2>
              <p>
                Gardening recommendations, weather forecasts, frost alerts, and soil temperature
                estimates are provided on a best-effort basis using third-party data sources. We do
                not guarantee their accuracy. Grow Daisy is an informational tool and should not be
                the sole basis for decisions that could result in crop loss or property damage.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Intellectual Property</h2>
              <p>
                The Grow Daisy app, its design, code, and content are owned by Daisy Apps. You retain
                ownership of any content you create (photos, notes, garden data). By using the service,
                you grant us a limited licence to store and process your content solely to provide the
                service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Daisy Apps shall not be liable for any
                indirect, incidental, or consequential damages arising from your use of the App.
                The App is provided &quot;as is&quot; without warranties of any kind.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Governing Law</h2>
              <p>
                These terms are governed by the laws of Spain. Any disputes shall be submitted to the
                courts of Spain, without prejudice to any mandatory consumer protection laws that may
                apply in your jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Changes to These Terms</h2>
              <p>
                We may update these terms from time to time. Material changes will be communicated
                via the app or email. Continued use of the App after changes constitutes acceptance
                of the updated terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">14. Contact</h2>
              <p>
                For questions about these terms, please contact us at{' '}
                <a href="mailto:hello@godaisy.io" className="text-emerald-600 underline">
                  hello@godaisy.io
                </a>.
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
