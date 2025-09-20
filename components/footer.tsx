// components/footer.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-theme="corporate" className="w-full bg-base-200 text-base-content">
      <div className="footer max-w-7xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <Image src="/little-daisy.png" alt="Go Daisy" className="w-auto" width={72} height={72} />
          <Image src="/go-daisy-logo.png" alt="Go Daisy logo" className="w-auto" width={112} height={28} />
        </aside>

        <div className="grid grid-cols-2 gap-6">
          <nav className="grid grid-flow-row gap-2">
            <Link href="/support" className="link link-hover block">Support Go Daisy</Link>
            <Link href="/HowWeDoIt" className="link link-hover block">How we do it</Link>
            <Link href="/whether-weather" className="link link-hover block">Sorry about the weather</Link>
            <Link href="/AboutUs" className="link link-hover block">About us</Link>
          </nav>

          <nav className="grid grid-flow-row gap-2">
            <Link href="/TermsAndConditions" className="link link-hover block">Terms of use</Link>
            <Link href="/PrivacyPolicy" className="link link-hover block">Privacy policy</Link>
            <Link href="/CookiePolicy" className="link link-hover block">Cookie policy</Link>
          </nav>
        </div>

        <nav className="md:text-right">
          <p className="text-sm opacity-70">Get out there!</p>
          <p className="text-xs opacity-60">© {year} Go Daisy. All rights reserved.</p>
        </nav>
      </div>
    </footer>
  );
}