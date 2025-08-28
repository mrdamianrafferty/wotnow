import React, { useState, useEffect } from "react";

const CookieConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  // Check if user has already consented or declined cookies
  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
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

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-300 text-base-content p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 z-50" data-theme="wotnow">
      <p className="max-w-lg text-sm">
        We use cookies to enhance your experience. By continuing to use our site, you agree to our use of cookies. See our{" "}
        <a href="/privacy-policy" className="underline text-primary">Privacy Policy</a> for more info.
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
};

export default CookieConsentBanner;
