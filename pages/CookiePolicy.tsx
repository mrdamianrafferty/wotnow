import React, { useState, useEffect } from "react";
import Link from "next/link";
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
        <Link href="/privacy-policy" className="underline text-primary">
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
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-lg shadow-lg space-y-4">
          <h1 className="text-4xl font-bold mb-2 text-primary-content">Cookie Policy</h1>
          <p>
            This page explains how Go Daisy uses cookies and similar technologies. You can manage your consent using the banner below.
          </p>
          {/* Add your full cookie policy content here */}
        </div>
      </main>

      <CookieConsentBanner />
      <Footer />
    </>
  );
}
