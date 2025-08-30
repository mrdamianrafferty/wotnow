import { useEffect } from "react";

export default function Footer() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//cdn.cookie-script.com/s/cf70205ea0838ef4a6bd42effcc7a71e.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <footer className="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
      <nav>
        <h6 className="footer-title">The boring bits 🥱</h6>
        <a href="/HowWeDoIt" className="link link-hover">How we do it</a>
        <a href="/whether-weather" className="link link-hover">Sorry about the weather</a>
        <a href="/AboutUs" className="link link-hover">About us</a>
      </nav>
      <nav>
        <a href="/TermsAndConditions" className="link link-hover">Terms of use</a>
        <a href="/PrivacyPolicy" className="link link-hover">Privacy policy</a>
        <a href="/CookiePolicy" className="link link-hover">Cookie policy</a>
      </nav>
    </footer>
  );
}
