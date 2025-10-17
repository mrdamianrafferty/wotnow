// pages/support.tsx

import Head from "next/head";
import { useCallback } from "react";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";

// Disable static generation
export async function getServerSideProps() {
  return { props: { theme: "light" } };
}

export default function SupportPage() {
  const openAppTip = useCallback((amount: number) => {
    const scheme = `godaisy://support/tip?amount=${amount}`;
    const fallback = "https://apps.apple.com/app/idYOUR_APP_ID";
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
        <title>Support Go Daisy</title>
        <meta
          name="description"
          content="Join the Go Daisy community on Patreon or tip via Apple. Help cover weather data, hosting, and keep Damian — and Bruno — in biscuits."
        />
        <meta property="og:title" content="Support Go Daisy" />
        <meta
          property="og:description"
          content="Join the Go Daisy community on Patreon or tip via Apple. Help cover weather data, hosting, and keep Damian — and Bruno — in biscuits."
        />
        <meta property="og:image" content="/doggy.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Support Go Daisy" />
        <meta
          name="twitter:description"
          content="Join the Go Daisy community on Patreon or tip via Apple. Help cover weather data, hosting, and keep Damian — and Bruno — in biscuits."
        />
        <meta name="twitter:image" content="/doggy.jpg" />
      </Head>

      {/* THEME SCOPE — everything inside uses DaisyUI "light" regardless of the rest of the site */}
      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content">
        <AppHeader onOpenHomeDialog={() => {}} onOpenCoastDialog={() => {}} />

        <main className="container mx-auto max-w-3xl px-4 py-10 space-y-10">
          {/* Hero */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body space-y-4">
              <h2 className="card-title text-3xl">Keep Go Daisy Blooming</h2>
              <p className="leading-relaxed">
                Go Daisy isn’t just an app — it’s a small, friendly community of people who
                prefer doing to doom-scrolling. If our forecasts and nudges helped you rally mates,
                discover a cracking day out, or dodge a downpour, you can support the project and
                keep it blooming.
              </p>
              <div className="flex flex-wrap gap-2 text-xs opacity-80">
                <span className="badge badge-outline">Community-first</span>
                <span className="badge badge-outline">No paywalls</span>
                <span className="badge badge-outline">Indie & friendly</span>
              </div>
            </div>
          </div>

          {/* Support options */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Patreon card */}
            <div className="card bg-base-200">
              <div className="card-body space-y-3">
                <h2 className="card-title text-lg">Join us on Patreon</h2>
                <p>
                  Be part of the gang who keep Go Daisy buzzing — with early peeks at features,
                  gentle nudges to get outside, and the odd behind-the-scenes chuckle.
                </p>
                <a
                  className="btn btn-primary"
                  href="https://patreon.com/GoDaisy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🌼 Support via Patreon
                </a>
              </div>
            </div>

            {/* Apple Tip Jar card */}
            <div className="card bg-base-200">
              <div className="card-body space-y-3">
                <h2 className="card-title text-lg">Apple Tip Jar</h2>
                <p>
                  Quick, simple, one-off thanks inside the Apple ecosystem. No perks, just a
                  pat on the back (and a biscuit for Bruno).
                </p>
                {[{label:"☕ Coffee", amount:2}, {label:"🍺 Pint", amount:5}, {label:"🌼 Daisy Boost", amount:10}].map((t) => (
                  <button
                    key={t.amount}
                    className="btn btn-outline"
                    onClick={() => openAppTip(t.amount)}
                  >
                    <span>{t.label}</span>
                    <span className="ml-2 font-semibold">€{t.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transparency */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg">Transparency</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>Memberships and tips are optional and non-refundable — a thank-you, not a transaction.</li>
                <li>No features are gated behind support. Everyone gets the same forecast.</li>
                <li>Patreon updates and progress notes are shared with supporters; feature launches land for all users.</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Frequently asked questions</h2>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-base font-medium">Does support unlock features?</div>
              <div className="collapse-content">
                <p>Afraid not. Support keeps the lights on and the data flowing, but features roll out to everyone.</p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-base font-medium">Can I cancel any time?</div>
              <div className="collapse-content">
                <p>Yes — Patreon manages billing. You can switch tiers or cancel whenever you like. Apple tips are one-off.</p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-base font-medium">Other ways to help?</div>
              <div className="collapse-content">
                <p>Tell a friend, start a plan, or share your favourite Go Daisy moment. Word of mouth is golden.</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}