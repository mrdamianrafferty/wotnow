// pages/findr/terms.tsx

import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

export default function FindrTermsAndConditions() {
  return (
    <>
      <FindrHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12 pb-20 md:pb-12" data-theme="corporate">
        <div className="max-w-3xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-primary-content">
            <TranslatedText text="Findr Terms and Conditions" />
          </h1>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="1. Fishing Predictions Are Not Guarantees" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="Findr provides fishing predictions based on environmental data, marine conditions, and species biology. However, fishing success depends on many factors including local conditions, fish behavior, technique, and luck. Our predictions are guidance only and do not guarantee any particular result." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="2. Marine and Weather Data Limitations" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="While we use reputable data sources (Copernicus, Met.no, FishBase), marine and weather conditions can change rapidly. You should always verify local conditions before heading out and use your own judgment about safety." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="3. Safety First" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="Fishing and marine activities carry inherent risks. Findr is a planning tool, not a safety advisor. You are responsible for:" />
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-base-content">
              <li><TranslatedText text="Checking weather and sea conditions before departing" /></li>
              <li><TranslatedText text="Using appropriate safety equipment" /></li>
              <li><TranslatedText text="Following local regulations and fishing licenses" /></li>
              <li><TranslatedText text="Respecting catch limits and conservation rules" /></li>
              <li><TranslatedText text="Exercising good judgment about personal safety" /></li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="4. No Accuracy Guarantees" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="We strive to provide accurate predictions, but we make no guarantees about the completeness, accuracy, or reliability of any information. Marine data coverage varies by location, and predictions may differ from actual conditions." />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="5. Use at Your Own Risk" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="By using Findr, you acknowledge that you do so at your own risk. We cannot be held responsible for any harm, injury, loss, or damage arising from:" />
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-base-content">
              <li><TranslatedText text="Acting on fishing predictions or environmental data" /></li>
              <li><TranslatedText text="Inaccurate or outdated information" /></li>
              <li><TranslatedText text="Marine accidents or weather-related incidents" /></li>
              <li><TranslatedText text="Poor fishing results or wasted trips" /></li>
              <li><TranslatedText text="Any other direct or indirect consequences of using the app" /></li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="6. Fishing Regulations" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="Findr provides information about fish species but does not track local fishing regulations, seasons, or conservation measures. You are responsible for knowing and following all applicable laws, including:" />
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-base-content">
              <li><TranslatedText text="Valid fishing licenses and permits" /></li>
              <li><TranslatedText text="Species-specific regulations and protected areas" /></li>
              <li><TranslatedText text="Size and bag limits" /></li>
              <li><TranslatedText text="Seasonal closures" /></li>
              <li><TranslatedText text="Gear restrictions" /></li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="7. Content and Updates" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text='Findr is provided "as is" without warranties. We may update species data, algorithms, or features at any time without notice. Historical predictions and scores may change as we improve our models.' />
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="8. Third-Party Data" />
            </h2>
            <p className="text-base-content">
              <TranslatedText text="Findr relies on data from third-party sources (Copernicus, Met.no, FishBase, etc.). We are not responsible for the accuracy or availability of their data. Links to external sites do not imply endorsement." />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              <TranslatedText text="Plain English Summary:" />
            </h2>
            <ul className="list-disc list-inside space-y-1 text-base-content">
              <li><TranslatedText text="Predictions aren't guarantees: We help you plan, but fish are unpredictable." /></li>
              <li><TranslatedText text="Safety is your responsibility: Always check conditions and use good judgment." /></li>
              <li><TranslatedText text="Follow the law: Know and respect local fishing regulations." /></li>
              <li><TranslatedText text="Use at your own risk: We're not liable if things go wrong." /></li>
              <li><TranslatedText text="Data may vary: Marine data isn't perfect everywhere." /></li>
            </ul>
          </section>

          <div className="mt-8 p-4 bg-info/20 rounded">
            <p className="text-sm">
              <TranslatedText text="Last updated: October 2025" />
            </p>
            <p className="text-sm mt-2">
              <TranslatedText text="Questions? Contact us at" />{" "}
              <a href="mailto:hello@godaisy.com" className="link">
                hello@godaisy.com
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
