// pages/findr/privacy.tsx

import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

export default function FindrPrivacyPolicy() {
  return (
    <>
      <FindrHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 lg:p-12 pb-20 lg:pb-12" data-theme="corporate">
        <div className="max-w-3xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-primary"><TranslatedText text="Findr Privacy Policy" /></h1>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="1. What Data We Collect" /></h2>
            <p className="text-base-content mb-2">
              <TranslatedText text="Findr collects and stores only what you choose to provide:" />
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-base-content">
              <li><TranslatedText text="Fishing locations: You manually set locations where you want predictions" /></li>
              <li><TranslatedText text="Target species: Species you select as favorites or targets" /></li>
              <li><TranslatedText text="Account data: Email address if you create an account (optional)" /></li>
              <li><TranslatedText text="Usage data: Which features you use to improve the app (anonymous)" /></li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="2. Location Privacy" /></h2>
            <p className="text-base-content">
              <TranslatedText text="We do not track your actual location automatically. You choose which locations to add, and you can change or remove them at any time. Your fishing spots are private and never shared." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="3. How We Use Your Data" /></h2>
            <p className="text-base-content">
              <TranslatedText text="Your data is used exclusively to:" />
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-base-content">
              <li><TranslatedText text="Provide fishing predictions for your chosen locations" /></li>
              <li><TranslatedText text="Display species information relevant to your targets" /></li>
              <li><TranslatedText text="Sync your preferences across devices (if logged in)" /></li>
              <li><TranslatedText text="Improve our algorithms and features (anonymously)" /></li>
            </ul>
            <p className="text-base-content mt-2">
              <TranslatedText text="That's it. No hidden purposes, no selling data, no tracking for advertising." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="4. Data Sharing" /></h2>
            <p className="text-base-content">
              <TranslatedText text="We do not share, sell, or rent your personal data to third parties. Period." />
            </p>
            <p className="text-base-content mt-2">
              <TranslatedText text="The only exception: If legally required by court order or government authority." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="5. Third-Party Services" /></h2>
            <p className="text-base-content">
              <TranslatedText text="Findr uses these third-party services:" />
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-base-content">
              <li><TranslatedText text="Supabase: Secure database hosting (GDPR-compliant)" /></li>
              <li><TranslatedText text="Google Maps: Map display and location search" /></li>
              <li><TranslatedText text="Copernicus/Met.no: Marine and weather data (anonymous API calls)" /></li>
            </ul>
            <p className="text-base-content mt-2">
              <TranslatedText text="These services have their own privacy policies and security measures." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="6. Data Storage and Security" /></h2>
            <p className="text-base-content">
              <TranslatedText text="Your data is stored securely using industry-standard encryption. We use GDPR-compliant hosting providers in the EU. While we take security seriously, no system is 100% secure—use strong passwords." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="7. Your Rights (GDPR)" /></h2>
            <p className="text-base-content">
              <TranslatedText text="Findr is based in Spain and fully complies with GDPR. You have the right to:" />
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-base-content">
              <li><TranslatedText text="Access: See what data we have about you" /></li>
              <li><TranslatedText text="Correct: Fix any incorrect information" /></li>
              <li><TranslatedText text="Delete: Remove your account and all associated data" /></li>
              <li><TranslatedText text="Export: Download your data in portable format" /></li>
              <li><TranslatedText text="Object: Stop us from processing your data" /></li>
            </ul>
            <p className="text-base-content mt-2">
              <TranslatedText text="Contact us at" />{" "}
              <a href="mailto:hello@fishfindr.eu" className="link">
                hello@fishfindr.eu
              </a>{" "}
              <TranslatedText text="to exercise any of these rights." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="8. Children's Privacy" /></h2>
            <p className="text-base-content">
              <TranslatedText text="Findr is not intended for children under 13. We do not knowingly collect data from children. If you believe we've collected data from a child, please contact us immediately." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="9. Changes to This Policy" /></h2>
            <p className="text-base-content">
              <TranslatedText text="We may update this policy occasionally. Significant changes will be communicated via the app or email. Continued use after changes means you accept the updated policy." />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="Plain English Summary" /></h2>
            <ul className="list-disc list-inside space-y-1 text-base-content">
              <li><TranslatedText text="We only collect what you choose to give us (locations, species, email)" /></li>
              <li><TranslatedText text="We don't track you automatically or share/sell your data" /></li>
              <li><TranslatedText text="Your data is used only to provide fishing predictions" /></li>
              <li><TranslatedText text="We follow Europe's strict GDPR privacy laws" /></li>
              <li><TranslatedText text="You can delete your data anytime" /></li>
            </ul>
          </section>

          <div className="mt-8 p-4 bg-info/20 rounded">
            <p className="text-sm">
              <TranslatedText text="Last updated: October 2025" />
            </p>
            <p className="text-sm mt-2">
              <TranslatedText text="Questions about privacy? Contact us at" />{" "}
              <a href="mailto:hello@fishfindr.eu" className="link">
                hello@fishfindr.eu
              </a>
            </p>
          </div>
        </div>
      </main>

      <FindrFooter />
      <FindrBottomNav />
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
