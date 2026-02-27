// pages/findr/support.tsx

import Head from "next/head";
import { useCallback } from "react";
import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

// Disable static generation
export async function getServerSideProps() {
  return { props: { theme: "light" } };
}

export default function FindrSupportPage() {
  const openAppTip = useCallback((amount: number) => {
    const scheme = `godaisy://support/tip?amount=${amount}`;
    const fallback = "https://apps.apple.com/app/id6755045700";
    const start = Date.now();
    window.location.href = scheme;
    const t = setTimeout(() => {
      if (Date.now() - start < 1500) window.location.href = fallback;
    }, 1200);
    setTimeout(() => clearTimeout(t), 2500);
  }, []);

  return (
    <>
      <Head>
        <title>Support - findr</title>
        <meta
          name="description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta property="og:title" content="Support Findr" />
        <meta
          property="og:description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta property="og:image" content="/doggy.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Support Findr" />
        <meta
          name="twitter:description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta name="twitter:image" content="/doggy.jpg" />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content pb-16 lg:pb-0">
        <FindrHeader />

        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6"><TranslatedText text="Support Findr" /></h1>

          <div className="prose prose-lg max-w-none">
            <p className="lead text-xl mb-8">
              <TranslatedText text="Findr is a passion project built to help anglers make smarter decisions based on real environmental data. Your support helps keep it running and growing!" />
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Why Support Findr?" /></h2>
              <ul className="space-y-2">
                <li><TranslatedText text="🌊 Covers costs for marine and weather data APIs" /></li>
                <li><TranslatedText text="☁️ Keeps servers running and predictions flowing" /></li>
                <li><TranslatedText text="🐟 Funds ongoing species data research and improvements" /></li>
                <li><TranslatedText text="🎣 Supports continued development of new features" /></li>
                <li><TranslatedText text="🦴 Keeps the developer (and Bruno the dog) in biscuits" /></li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Join the Findr Community" /></h2>
              <div className="card bg-primary text-primary-content p-6 mb-6">
                <h3 className="text-2xl font-bold mb-2"><TranslatedText text="Become a Patreon" /></h3>
                <p className="mb-4">
                  <TranslatedText text="Get exclusive early access to new features, monthly development updates, and have a say in what gets built next." />
                </p>
                <a
                  href="https://patreon.com/GoDaisy?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-wide"
                >
                  <TranslatedText text="Join on Patreon" />
                </a>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="One-time Tip (Apple Users)" /></h2>
              <p className="mb-4">
                <TranslatedText text="If you use the iOS app, you can leave a tip through Apple's in-app purchases. Every contribution helps!" />
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => openAppTip(99)} className="btn btn-outline">
                  <TranslatedText text="🍵 Cuppa (£0.99)" />
                </button>
                <button onClick={() => openAppTip(299)} className="btn btn-outline">
                  <TranslatedText text="☕ Coffee (£2.99)" />
                </button>
                <button onClick={() => openAppTip(499)} className="btn btn-outline">
                  <TranslatedText text="🥐 Breakfast (£4.99)" />
                </button>
                <button onClick={() => openAppTip(999)} className="btn btn-outline">
                  <TranslatedText text="🍽️ Dinner (£9.99)" />
                </button>
              </div>
              <p className="text-sm opacity-70 mt-4">
                <TranslatedText text="Note: These buttons open the Findr iOS app. If you don't have it installed, you'll be redirected to the App Store." />
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Every Little Helps" /></h2>
              <p>
                <TranslatedText text="Whether you're a regular supporter or just want to buy us a virtual coffee, we're genuinely grateful. Findr is built by a tiny team (one human, one dog), and your support makes a real difference in keeping this project alive and kicking." />
              </p>
            </section>

            <div className="alert alert-info">
              <div>
                <p className="font-semibold"><TranslatedText text="Questions about supporting Findr?" /></p>
                <p className="text-sm">
                  <TranslatedText text="Get in touch at" />{" "}
                  <a href="mailto:hello@fishfindr.eu" className="link">
                    hello@fishfindr.eu
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

        <FindrFooter />
        <FindrBottomNav />
      </div>
    </>
  );
}
