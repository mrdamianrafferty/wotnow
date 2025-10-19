import Head from "next/head";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Go Daisy</title>
      </Head>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-3xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-primary">Privacy Policy</h1>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">1. User-Set Locations Only</h2>
            <p className="text-base-content">
              We do <strong>not track your actual location automatically</strong>. You can set and store locations manually within the app for which you want weather forecasts and recommendations. You can change or remove these stored locations at any time.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">2. Use of Data</h2>
            <p className="text-base-content">
              We collect and store your manually set locations and your preferences, such as your favourite activities, in order to provide personalised weather updates and recommendations tailored to your interests.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">3. Data Sharing and Advertising</h2>
            <p className="text-base-content">
              We <strong>do not share your location or personal data with third-party advertisers</strong>. We do not sell your data or use it in any hidden or sneaky ways. Your privacy and trust are our top priority.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">4. Future Advertising</h2>
            <p className="text-base-content">
              We reserve the right to offer <strong>personalised advertising in the future</strong> to enhance your experience in the app. Such advertising will only be implemented <strong>with your explicit consent</strong>, and you will always have control over whether you receive these ads.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary">5. GDPR and Legal Compliance</h2>
            <p className="text-base-content">
              Go Daisy is based in Spain and fully complies with the <strong>General Data Protection Regulation (GDPR)</strong>, ensuring your data is handled with the highest privacy standards. Even if you use the app in regions with less stringent privacy laws, our practices will always comply with GDPR standards.
            </p>
            <p className="text-base-content">
              You have the right to access, correct, delete your stored data, and to restrict or object to our data processing. For any questions or to exercise your rights, please contact us at [your contact email].
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary">Plain English Summary</h2>
            <ul className="list-disc list-inside space-y-1 text-base-content">
              <li>We don’t automatically track you. You choose locations to get weather info.</li>
              <li>Your data is used only to make your experience better.</li>
              <li>We never share or sell your data.</li>
              <li>If we add ads later, you’ll have the choice to accept them.</li>
              <li>We follow Europe’s strict GDPR privacy laws, no matter where you use the app.</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Disable static generation
export async function getServerSideProps() {
  return { props: {} };
}
