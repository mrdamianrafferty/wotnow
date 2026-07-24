// components/footer.tsx
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '../lib/analytics/events';

// Go Daisy is the umbrella app in the Daisy family, so its footer links out
// to every sibling app (unlike the specialist apps, which only link to the
// one or two siblings relevant to their audience).
const DAISY_FAMILY_LINKS = [
  { label: 'Rise Daisy', toApp: 'rise_daisy', url: 'https://www.risedaisy.com/?utm_source=go_daisy&utm_medium=cross_promo&utm_content=footer' },
  { label: 'findr', toApp: 'findr', url: 'https://fishfindr.eu/?utm_source=go_daisy&utm_medium=cross_promo&utm_content=footer' },
  { label: 'Fly Cast Coach', toApp: 'fly_cast_coach', url: 'https://flycastcoach.com/?utm_source=go_daisy&utm_medium=cross_promo&utm_content=footer' },
] as const;

function handleCrossPromoClick(toApp: string) {
  trackEvent('cross_promo_click', { from_app: 'go_daisy', to_app: toApp, placement: 'footer' });
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-theme="corporate" className="w-full bg-base-200 text-base-content">
      <div className="footer max-w-7xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <Image src="/little-daisy.png" alt="Go Daisy" width={40} height={40} style={{ width: 40, height: 40 }} />
          <Image src="/go-daisy-logo.png" alt="Go Daisy logo" width={112} height={28} style={{ width: 112, height: 28 }} />
          <p className="text-xs text-gray-500">
            Part of the Daisy family:{' '}
            {DAISY_FAMILY_LINKS.map(({ label, toApp, url }, i) => (
              <span key={toApp}>
                {i > 0 && ', '}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCrossPromoClick(toApp)}
                  className="hover:underline font-medium"
                  style={{ color: '#0369a1' }}
                >
                  {label}
                </a>
              </span>
            ))}
          </p>
        </aside>

        <div className="grid grid-cols-2 gap-6">
          <nav className="grid grid-flow-row gap-2" aria-label="Support links">
            <Link href="/support" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>Support Go Daisy</Link>
            <Link href="/HowWeDoIt" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>How we do it</Link>
            <Link href="/whether-weather" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>Sorry about the weather</Link>
            <Link href="/AboutUs" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>About us</Link>
          </nav>

          <nav className="grid grid-flow-row gap-2" aria-label="Legal links">
            <Link href="/TermsAndConditions" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>Terms of use</Link>
            <Link href="/PrivacyPolicy" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>Privacy policy</Link>
            <Link href="/CookiePolicy" className="block hover:underline hover:text-primary" style={{ color: '#1f2937' }}>Cookie policy</Link>
          </nav>
        </div>

        <nav className="md:text-right">
          <p className="text-sm text-gray-600">Get out there!</p>
          <p className="text-xs text-gray-500">© {year} Go Daisy. All rights reserved.</p>
        </nav>
      </div>
    </footer>
  );
}