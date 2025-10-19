// pages/findr/cookies.tsx

import React, { useState, useEffect } from "react";
import Link from "next/link";
import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

export function FindrCookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = typeof window !== 'undefined' ? localStorage.getItem("findrCookieConsent") : null;
    if (consent !== "accepted" && consent !== "declined") {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("findrCookieConsent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("findrCookieConsent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-base-300 text-base-content p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 z-50"
      data-theme="corporate"
    >
      <p className="max-w-lg text-sm">
        <TranslatedText text="We use cookies to enhance your experience. By continuing to use Findr, you agree to our use of cookies. See our" />{" "}
        <Link href="/findr/privacy" className="underline text-primary">
          <TranslatedText text="Privacy Policy" />
        </Link>{" "}
        <TranslatedText text="for more info." />
      </p>
      <div className="flex gap-2">
        <button onClick={acceptCookies} className="btn btn-primary btn-sm">
          <TranslatedText text="Accept All" />
        </button>
        <button onClick={declineCookies} className="btn btn-outline btn-sm">
          <TranslatedText text="Decline" />
        </button>
      </div>
    </div>
  );
}

export default function FindrCookiePolicy() {
  return (
    <>
      <FindrHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12 pb-20 md:pb-12" data-theme="corporate">
        <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg space-y-6">
          <h1 className="text-4xl font-bold mb-4 text-primary-content"><TranslatedText text="Findr Cookie Policy" /></h1>
          
          <p className="text-lg">
            <TranslatedText text="This policy explains how Findr uses cookies and similar technologies to improve your experience." />
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="What Are Cookies?" /></h2>
            <p>
              <TranslatedText text="Cookies are small text files stored on your device when you use Findr. They help us remember your preferences, keep you logged in, and understand how you use the app." />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="How We Use Cookies" /></h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold"><TranslatedText text="Essential Cookies (Always On)" /></h3>
                <p className="text-sm">
                  <TranslatedText text="These cookies are necessary for Findr to work properly. They remember your login session, preferences, and selected locations." />
                </p>
              </div>
              <div>
                <h3 className="font-semibold"><TranslatedText text="Functional Cookies" /></h3>
                <p className="text-sm">
                  <TranslatedText text="These help personalize your experience—remembering your favorite species, display preferences, and recently viewed locations." />
                </p>
              </div>
              <div>
                <h3 className="font-semibold"><TranslatedText text="Analytics Cookies (Optional)" /></h3>
                <p className="text-sm">
                  <TranslatedText text="If you consent, we use anonymous analytics to understand which features are popular and how to improve Findr. No personal data is collected." />
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="What We Don't Do" /></h2>
            <ul className="list-disc list-inside space-y-1">
              <li><TranslatedText text="We don't use advertising cookies or trackers" /></li>
              <li><TranslatedText text="We don't share cookie data with advertisers" /></li>
              <li><TranslatedText text="We don't track you across other websites" /></li>
              <li><TranslatedText text="We don't sell cookie data to anyone" /></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="Managing Your Cookies" /></h2>
            <p>
              <TranslatedText text="You can control cookies through:" />
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><TranslatedText text="The consent banner when you first use Findr" /></li>
              <li><TranslatedText text="Your browser settings (most browsers let you block or delete cookies)" /></li>
              <li><TranslatedText text="Your device settings (for mobile apps)" /></li>
            </ul>
            <p className="mt-2 text-sm opacity-70">
              <TranslatedText text="Note: Blocking essential cookies will prevent Findr from working properly." />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="Third-Party Cookies" /></h2>
            <p>
              <TranslatedText text="Some features use third-party services that may set their own cookies:" />
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><TranslatedText text="Google Maps: For location search and map display" /></li>
              <li><TranslatedText text="Supabase: For authentication and data storage" /></li>
            </ul>
            <p className="mt-2">
              <TranslatedText text="These services have their own cookie policies independent of Findr." />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2 text-secondary"><TranslatedText text="Updates to This Policy" /></h2>
            <p>
              <TranslatedText text="We may update this cookie policy as we add new features. Check back periodically for changes." />
            </p>
          </section>

          <div className="alert alert-info">
            <div>
              <p className="font-semibold"><TranslatedText text="Questions about cookies?" /></p>
              <p className="text-sm">
                <TranslatedText text="Contact us at" />{" "}
                <a href="mailto:hello@godaisy.com" className="link">
                  hello@godaisy.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-base-300 rounded">
            <p className="text-sm">
              <TranslatedText text="Last updated: October 2025" />
            </p>
          </div>
        </div>
      </main>

      <FindrCookieConsentBanner />
      <FindrFooter />
      <FindrBottomNav />
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
