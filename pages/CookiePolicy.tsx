import React, { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";

// Local banner component (still available for reuse via named export)
export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = typeof window !== 'undefined' ? localStorage.getItem("cookieConsent") : null;
    if (consent !== "accepted" && consent !== "declined") {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-base-300 text-base-content p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 z-50"
      data-theme="corporate"
    >
      <p className="max-w-lg text-sm">
        We use cookies to enhance your experience. By continuing to use our site, you agree to our use of cookies. See our{" "}
        <Link href="/privacy" className="underline text-primary">
          Privacy Policy
        </Link>{" "}
        for more info.
      </p>
      <div className="flex gap-2">
        <button onClick={acceptCookies} className="btn btn-primary btn-sm">
          Accept All
        </button>
        <button onClick={declineCookies} className="btn btn-outline btn-sm">
          Decline
        </button>
      </div>
    </div>
  );
}

export default function CookiePolicy() {
  return (
    <>
      <Head>
        <title>Cookie Policy - Go Daisy</title>
      </Head>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg space-y-4">
          <h1 className="text-4xl font-bold mb-2 text-primary">Cookie Policy</h1>
          <p>
            This page explains how Go Daisy uses cookies and similar technologies. You can manage your consent using the banner below.
          </p>

          <section className="mt-6 space-y-4">
            <h2 className="text-2xl font-semibold text-secondary">What cookies do we use?</h2>
            <p>
              We use cookies to personalise the content so it&apos;s actually useful to you. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Essential cookies:</strong> These keep the app working — things like remembering that you&apos;re logged in and storing your cookie consent preference.</li>
              <li><strong>Preference cookies:</strong> These remember your settings, such as your chosen location, language, and activity interests, so we can show you relevant weather and recommendations.</li>
              <li><strong>Analytics cookies:</strong> We use Vercel Analytics to understand how people use the app so we can make it better. This data is aggregated and anonymous.</li>
            </ul>
          </section>

          <section className="mt-6 space-y-4">
            <h2 className="text-2xl font-semibold text-secondary">Third-party cookies</h2>
            <p>
              We don&apos;t share your data with advertisers. Google Maps may set cookies when you use the location search feature. See{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google&apos;s Privacy Policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section className="mt-6 space-y-4">
            <h2 className="text-2xl font-semibold text-secondary">Managing your preferences</h2>
            <p>
              You can accept or decline cookies using the banner at the bottom of the page. You can also clear cookies at any time through your browser settings. Note that disabling essential cookies may affect how the app works.
            </p>
            <p>
              For more details about how we handle your data, see our{" "}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>

      <CookieConsentBanner />
      <Footer />
    </>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
