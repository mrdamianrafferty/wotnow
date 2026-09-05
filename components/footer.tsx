/**
 * The footer, in the new design.
 *
 * It appears on the landing page, the account page, the FAQ, the legal pages
 * and every long-form page besides — so it was the last DaisyUI surface still
 * showing under the redesign, complete with `data-theme="corporate"` and eight
 * hardcoded hex values that answered to no token. On a cream page with a serif
 * wordmark above it, a grey `bg-base-200` slab reads as a different website.
 *
 * IT IS A BASE, NOT A CARD. A hairline and a shift of ground, no border box and
 * no shadow — the page ends here rather than containing one last panel. The
 * columns get labels because the links had none: "Terms of use" and "About us"
 * sat in one undifferentiated run, and a reader looking for the privacy policy
 * had to read all seven.
 *
 * The Daisy family list stays `lib/daisyFamily` — it is on ~2,000 indexed pages
 * and a second copy is a copy that will be wrong.
 *
 * @module components/Footer
 */

import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '../lib/analytics/events';
import { daisyFamily } from '../lib/daisyFamily';

// Go Daisy is the umbrella app in the Daisy family, so its footer links out to
// every sibling (unlike the specialist apps, which only link to the one or two
// relevant to their audience).
const DAISY_FAMILY_LINKS = daisyFamily('footer');

const ABOUT_LINKS = [
  { href: '/HowWeDoIt', label: 'How we do it' },
  { href: '/whether-weather', label: 'Sorry about the weather' },
  { href: '/AboutUs', label: 'About us' },
  { href: '/support', label: 'Support Go Daisy' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of use' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/cookies', label: 'Cookie policy' },
];

function handleCrossPromoClick(toApp: string) {
  trackEvent('cross_promo_click', { from_app: 'go_daisy', to_app: toApp, placement: 'footer' });
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="gd-foot">
      <div className="gd-foot-inner">
        <div className="gd-foot-cols">
          <div className="gd-foot-brand">
            <Image
              src="/little-daisy.png"
              alt=""
              width={36}
              height={36}
              style={{ width: 36, height: 36 }}
            />
            <p className="gd-foot-mark">Go Daisy</p>
            <p className="gd-foot-line">Weather you can act on.</p>
          </div>

          <nav className="gd-foot-col" aria-labelledby="foot-about">
            <h2 className="call-label gd-foot-title" id="foot-about">Go Daisy</h2>
            <ul className="gd-foot-list">
              {ABOUT_LINKS.map(({ href, label }) => (
                <li key={href}><Link href={href}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="gd-foot-col" aria-labelledby="foot-legal">
            <h2 className="call-label gd-foot-title" id="foot-legal">Legal</h2>
            <ul className="gd-foot-list">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}><Link href={href}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="gd-foot-col is-family" aria-labelledby="foot-family">
            <h2 className="call-label gd-foot-title" id="foot-family">The Daisy family</h2>
            <ul className="gd-foot-list">
              {DAISY_FAMILY_LINKS.map(({ label, toApp, url }) => (
                <li key={toApp}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleCrossPromoClick(toApp)}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="gd-foot-rule">
          <span>© {year} Go Daisy</span>
          <span className="gd-foot-sendoff">Get out there.</span>
        </p>
      </div>
    </footer>
  );
}
