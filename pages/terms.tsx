import { DocPage } from '@/components/call/DocPage';
import Link from 'next/link';
import React from 'react';

export default function TermsOfService() {
  const lastUpdated = 'February 2026';

  return (
    <>
    <DocPage
      title="Terms of use"
      description="The terms you agree to when you use Go Daisy."
    >
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. About Go Daisy</h2>
              <p>
                Go Daisy (&quot;the App&quot;) is a weather-informed outdoor activity recommendation
                service provided by Daisy Apps (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By
                using the App you agree to these Terms of Service. If you do not agree, please do not
                use the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Use of the Service</h2>
              <p className="mb-2">You may use Go Daisy to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>View weather forecasts and conditions for your location</li>
                <li>Receive weather-informed recommendations for outdoor activities such as hiking, cycling, stargazing, and more</li>
                <li>Save location preferences for personalised recommendations</li>
                <li>View tide predictions, moon phases, and astronomy highlights</li>
              </ul>
              <p className="mt-2">
                You must be at least 13 years old to create an account. You are responsible for
                maintaining the security of your account credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. User Data</h2>
              <p>
                Data you provide (location preferences, activity interests, saved places) belongs to
                you. We store it to provide the service and sync across your devices. You can delete
                your data at any time by deleting your account in Settings. See our{' '}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>{' '}
                for full details on data handling.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Weather and Recommendation Accuracy</h2>
              <p>
                Weather forecasts, activity recommendations, tide predictions, and astronomy data are
                provided on a best-effort basis using third-party data sources. We do not guarantee
                their accuracy. Go Daisy is an informational tool and should not be the sole basis for
                decisions that could affect your safety. Always exercise your own judgement when
                planning outdoor activities.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Account Deletion</h2>
              <p>
                You can permanently delete your account and all associated data at any time from the
                Settings page. Deletion is irreversible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
              <p>
                The Go Daisy app, its design, code, and content are owned by Daisy Apps. You retain
                ownership of any content you create. By using the service, you grant us a limited
                licence to store and process your content solely to provide the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Daisy Apps shall not be liable for any
                indirect, incidental, or consequential damages arising from your use of the App.
                The App is provided &quot;as is&quot; without warranties of any kind.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Governing Law</h2>
              <p>
                These terms are governed by the laws of Spain. Any disputes shall be submitted to the
                courts of Spain, without prejudice to any mandatory consumer protection laws that may
                apply in your jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Changes to These Terms</h2>
              <p>
                We may update these terms from time to time. Material changes will be communicated
                via the app or email. Continued use of the App after changes constitutes acceptance
                of the updated terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Contact</h2>
              <p>
                For questions about these terms, please contact us at{' '}
                <a href="mailto:hello@godaisy.io" className="text-primary underline">
                  hello@godaisy.io
                </a>.
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
    </DocPage>
    </>
  );
}
