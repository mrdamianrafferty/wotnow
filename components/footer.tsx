import { useEffect } from "react";
import Link from "next/link";

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
    <footer>
      <nav>
        <h6 className="footer-title">The boring bits 🥱</h6>
        <Link href="/support" className="link link-hover">Support Go Daisy</Link>
        <Link href="/HowWeDoIt" className="link link-hover">How we do it</Link>
        <Link href="/whether-weather" className="link link-hover">Sorry about the weather</Link>
        <Link href="/AboutUs" className="link link-hover">About us</Link>
      </nav>
      <nav>
        <Link href="/TermsAndConditions" className="link link-hover">Terms of use</Link>
        <Link href="/PrivacyPolicy" className="link link-hover">Privacy policy</Link>
        <Link href="/CookiePolicy" className="link link-hover">Cookie policy</Link>
      </nav>
    </footer>
  );
}
