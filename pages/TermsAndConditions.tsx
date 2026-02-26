import Head from "next/head";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";


export default function TermsAndConditions() {
  return (
    <>
      <Head>
        <title>Terms &amp; Conditions - Go Daisy</title>
      </Head>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-3xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-primary">
            Terms and Conditions
          </h1>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              1. Weather Forecasts Are Predictions Only
            </h2>
            <p className="text-base-content">
              The weather information and forecasts provided by this app are based on data models and scientific predictions. However, weather is inherently unpredictable and conditions can change rapidly. You should <strong>always double check local weather sources</strong> and use your own judgement before undertaking any outdoor activities.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              2. No Guarantee of Accuracy
            </h2>
            <p className="text-base-content">
              While we strive to provide accurate and up-to-date weather information, we make <strong>no guarantees or warranties</strong> about the completeness, accuracy, reliability, or timeliness of any data presented. Weather forecasts may differ from actual conditions.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              3. Use at Your Own Risk
            </h2>
            <p className="text-base-content">
              By using this app and relying on the weather forecasts or recommendations, you acknowledge that you do so <strong>at your own risk</strong>. Activities based on this information involve inherent risks, including personal injury or property damage.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              4. No Liability
            </h2>
            <p className="text-base-content">
              We <strong>cannot be held responsible for any harm, injury, loss, or damage</strong> arising from your use of the weather information or from any activities you undertake based on it. This includes any direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              5. General Terms
            </h2>
            <p className="text-base-content mb-2">
              This app and its content are provided &quot;as is&quot; without warranties of any kind, either express or implied.
            </p>
            <p className="text-base-content mb-2">
              We may update or change content at any time without notice.
            </p>
            <p className="text-base-content">
              The presence of any external links does not imply an endorsement or responsibility for those external sites or their content.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              6. Subscriptions &amp; Billing
            </h2>
            <p className="text-base-content mb-2">
              Some features require a paid subscription. Subscriptions are billed monthly, annually, or as a one-time lifetime purchase, depending on the plan you choose.
            </p>
            <p className="text-base-content mb-2">
              <strong>Auto-renewal:</strong> Monthly and annual subscriptions renew automatically at the end of each billing period. You will be charged the same amount unless you cancel before the renewal date.
            </p>
            <p className="text-base-content">
              All payments are processed securely through Stripe. We do not store your payment card details.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              7. Free Trials
            </h2>
            <p className="text-base-content mb-2">
              We may offer free trial periods for premium features. At the end of a free trial, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.
            </p>
            <p className="text-base-content">
              Free trials are limited to one per user account.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              8. Cancellation &amp; Refunds
            </h2>
            <p className="text-base-content mb-2">
              You can cancel your subscription at any time from your account settings or via the Stripe billing portal. When you cancel:
            </p>
            <ul className="list-disc list-inside space-y-1 text-base-content mb-2">
              <li>You keep access to premium features until the end of your current billing period.</li>
              <li>No further charges will be made after cancellation.</li>
              <li>We do not offer partial refunds for unused time in a billing period.</li>
            </ul>
            <p className="text-base-content">
              If you believe you were charged in error, contact us at support@godaisy.io within 14 days of the charge.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              9. Account Termination
            </h2>
            <p className="text-base-content mb-2">
              You may delete your account at any time. Deleting your account will cancel any active subscriptions and permanently remove your data.
            </p>
            <p className="text-base-content">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behaviour.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">
              10. Governing Law
            </h2>
            <p className="text-base-content">
              These terms are governed by the laws of Spain. Any disputes will be resolved in the courts of Spain, without prejudice to any mandatory consumer protection rights in your country of residence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary">Legal Terms Explanation (Plain English):</h2>
            <ul className="list-disc list-inside space-y-1 text-base-content">
              <li><strong>No guarantees or warranties:</strong> We try our best but don&apos;t promise everything will be right.</li>
              <li><strong>Use at your own risk:</strong> If you get hurt or something goes wrong, it&apos;s on you, not us.</li>
              <li><strong>Liability:</strong> It means legal responsibility; here, we say we are not legally responsible for any problems.</li>
              <li><strong>&quot;As is&quot; basis:</strong> The app and weather info come with no promises about quality or accuracy.</li>
              <li><strong>Subscriptions:</strong> Paid plans renew automatically. You can cancel any time and keep access until the end of your billing period.</li>
              <li><strong>Free trials:</strong> Try before you buy. Cancel before the trial ends to avoid being charged.</li>
              <li><strong>Refunds:</strong> No partial refunds, but contact us if something seems wrong.</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
