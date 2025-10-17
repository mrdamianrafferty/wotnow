import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";


export default function TermsAndConditions() {
  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-3xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-primary-content">
            Terms and Conditions
          </h1>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              1. Weather Forecasts Are Predictions Only
            </h2>
            <p className="text-base-content">
              The weather information and forecasts provided by this app are based on data models and scientific predictions. However, weather is inherently unpredictable and conditions can change rapidly. You should <strong>always double check local weather sources</strong> and use your own judgement before undertaking any outdoor activities.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              2. No Guarantee of Accuracy
            </h2>
            <p className="text-base-content">
              While we strive to provide accurate and up-to-date weather information, we make <strong>no guarantees or warranties</strong> about the completeness, accuracy, reliability, or timeliness of any data presented. Weather forecasts may differ from actual conditions.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              3. Use at Your Own Risk
            </h2>
            <p className="text-base-content">
              By using this app and relying on the weather forecasts or recommendations, you acknowledge that you do so <strong>at your own risk</strong>. Activities based on this information involve inherent risks, including personal injury or property damage.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              4. No Liability
            </h2>
            <p className="text-base-content">
              We <strong>cannot be held responsible for any harm, injury, loss, or damage</strong> arising from your use of the weather information or from any activities you undertake based on it. This includes any direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">
              5. General Terms
            </h2>
            <p className="text-base-content mb-2">
              This app and its content are provided “as is” without warranties of any kind, either express or implied.
            </p>
            <p className="text-base-content mb-2">
              We may update or change content at any time without notice.
            </p>
            <p className="text-base-content">
              The presence of any external links does not imply an endorsement or responsibility for those external sites or their content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary-content">Legal Terms Explanation (Plain English):</h2>
            <ul className="list-disc list-inside space-y-1 text-base-content">
              <li><strong>No guarantees or warranties:</strong> We try our best but don’t promise everything will be right.</li>
              <li><strong>Use at your own risk:</strong> If you get hurt or something goes wrong, it’s on you, not us.</li>
              <li><strong>Liability:</strong> It means legal responsibility; here, we say we are not legally responsible for any problems.</li>
              <li><strong>“As is” basis:</strong> The app and weather info come with no promises about quality or accuracy.</li>
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
