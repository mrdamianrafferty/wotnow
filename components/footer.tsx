// components/footer.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const year = new Date().getFullYear();

  return (


<footer data-theme="corporate" className="footer sm:footer-horizontal bg-base-200 text-base-content p-10">
  <aside>
    <Image src="/little-daisy.png" alt="Go Daisy" className="h-18 w-auto" width={72} height={72} />
    <p>
<Image src="/go-daisy-logo.png" alt="Go Daisy logo" className="h-7 w-auto" width={112} height={28} />
              
    </p>
  </aside>
  <nav>

<Link href="/support" className="link link-hover block">Support Go Daisy</Link>
              <Link href="/HowWeDoIt" className="link link-hover block">How we do it</Link>
              <Link href="/whether-weather" className="link link-hover block">Sorry about the weather</Link>
              <Link href="/AboutUs" className="link link-hover block">About us</Link>
  </nav>
  <nav>


            <Link href="/TermsAndConditions" className="link link-hover block">Terms of use</Link>
            <Link href="/PrivacyPolicy" className="link link-hover block">Privacy policy</Link>
            <Link href="/CookiePolicy" className="link link-hover block">Cookie policy</Link>
  </nav>
  <nav>

            <p className="text-sm opacity-70">Get out there!</p>
            <p className="text-xs opacity-60">© {year} Go Daisy. All rights reserved.</p>
  </nav>
</footer>
  );
}