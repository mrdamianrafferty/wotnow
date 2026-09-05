import { DocPage } from '@/components/call/DocPage';
import React from 'react';

export default function PrivacyPolicy() {
  const lastUpdated = 'January 1, 2026';

  return (
    <>
    <DocPage
      title="Privacy policy"
      description="How Go Daisy, Grow Daisy and Findr collect, use and protect your information."
      updated={`Last updated: ${lastUpdated}`}
    >
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p>
                This Privacy Policy explains how WotNow (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects
                your information when you use our applications: Findr (fishfindr.eu), Go Daisy (godaisy.io),
                and Grow Daisy (grow.godaisy.io).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Account information (email address) when you create an account</li>
                <li>Location preferences you save for predictions and recommendations</li>
                <li>Catch logs and photos you upload (Findr only)</li>
                <li>Favorite species and activity preferences</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Device location (with your permission) for local predictions</li>
                <li>Device type and operating system for app optimization</li>
                <li>Usage analytics to improve our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6">
                <li>Provide personalized predictions based on your location</li>
                <li>Send notifications about optimal conditions (if enabled)</li>
                <li>Improve our prediction algorithms</li>
                <li>Respond to your support requests</li>
                <li>Ensure app security and prevent abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
              <p>
                Your data is stored securely using Supabase, a trusted cloud database provider.
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Row-level security policies on all user data</li>
                <li>Regular security audits and updates</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 mt-2">
                <li><strong>Supabase</strong> - Database and authentication</li>
                <li><strong>Google Maps</strong> - Location search and mapping</li>
                <li><strong>Copernicus Marine Service</strong> - Marine environmental data</li>
                <li><strong>Open-Meteo</strong> - Weather forecasts, air quality, pollen and soil data</li>
                <li><strong>Stripe</strong> - Payment processing for premium subscriptions (Findr, Grow Daisy)</li>
                <li><strong>Firebase Cloud Messaging</strong> - Push notifications (iOS app)</li>
                <li><strong>RevenueCat</strong> - In-app purchase management (iOS app)</li>
                <li><strong>Resend</strong> - Email notifications</li>
              </ul>
              <p className="mt-2">
                Each service has its own privacy policy governing how they handle data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at privacy@godaisy.io.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Location Data</h2>
              <p>
                Our apps request location permission to provide local predictions. Location data is:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Only collected when you grant permission</li>
                <li>Used solely for providing relevant predictions</li>
                <li>Not shared with third parties for advertising</li>
                <li>Can be disabled in your device settings at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
              <p>
                Our services are not directed to children under 13. We do not knowingly collect
                personal information from children under 13. If you believe we have collected
                such information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of
                significant changes by posting a notice in the app or sending an email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <ul className="list-none mt-2">
                <li>Email: privacy@godaisy.io</li>
              </ul>
            </section>
    </DocPage>
    </>
  );
}
