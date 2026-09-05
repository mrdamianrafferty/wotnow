/**
 * Get the app, and the rest of the family — phase 6.
 *
 * Lives at the bottom of every spot page. Those ~2,000 pages already rank and
 * are the only organic acquisition the product has, so they are where a
 * stranger actually arrives — and until now the only thing one could do from a
 * spot page was open the web app. No store link, no way to get it on a phone,
 * and no sign that four sibling apps exist.
 *
 * THE QR IS FOR THE OTHER SCREEN. Spot pages get read on a laptop — someone
 * planning a weekend — and the thing being sold runs on a phone. A link is
 * useless in that moment; a code they can point a phone at is the whole point.
 * On a phone the code is hidden, because scanning your own screen is not a
 * thing, and the button does the job.
 *
 * @module components/GetTheApp
 */

import Image from 'next/image';
import Link from 'next/link';
import { trackEvent } from '../lib/analytics/events';
import { APP_STORE_URL, APP_LINK_PATH, daisyFamily } from '../lib/daisyFamily';

export interface GetTheAppProps {
  /**
   * Where this instance sits, for the UTM and the analytics event.
   *
   * A footer link and a spot-page link have to be told apart, or there is no
   * way to find out whether the spot pages send anyone anywhere — which is the
   * one question these pages exist to answer.
   */
  placement: string;
  /** Names the spot in the heading, where there is one. */
  place?: string;
}

export default function GetTheApp({ placement, place }: GetTheAppProps) {
  const family = daisyFamily(placement);

  return (
    <section className="gd-app" aria-labelledby="gd-app-title">
      <div className="gd-app-inner">
        <div className="gd-app-main">
          <h2 id="gd-app-title" className="gd-app-title">
            {place ? `Go Daisy knows ${place}` : 'Go Daisy, on your phone'}
          </h2>
          <p className="gd-app-lede">
            One message a day telling you what today is good for. Free, ad-free, and it
            works out the answer before you ask.
          </p>

          <div className="gd-app-cta">
            <a
              className="gd-app-store"
              href={APP_STORE_URL}
              onClick={() => trackEvent('cross_promo_click', {
                from_app: 'go_daisy', to_app: 'app_store', placement,
              })}
            >
              Download on the App Store
            </a>
            <Link className="gd-app-web" href="/call">
              Or use it in this browser
            </Link>
          </div>
        </div>

        {/*
          * Hidden on phones by CSS, not by a user-agent check: a media query is
          * decided by the device that is actually rendering, where a UA string
          * is decided by whichever device warmed the CDN cache first.
          */}
        <div className="gd-app-qr" aria-hidden="true">
          <Image
            src="/godaisy-app-qr.svg"
            alt=""
            width={104}
            height={104}
            unoptimized
          />
          <span className="gd-app-qr-caption">Point a phone at this</span>
        </div>
      </div>

      <div className="gd-family">
        <p className="gd-family-lede">The rest of what we make</p>
        <ul className="gd-family-list">
          {family.map((app) => (
            <li key={app.toApp}>
              <a
                href={app.url}
                onClick={() => trackEvent('cross_promo_click', {
                  from_app: 'go_daisy', to_app: app.toApp, placement,
                })}
              >
                <span className="gd-family-name">{app.label}</span>
                <span className="gd-family-blurb">{app.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* The QR encodes this, so it is worth being a real link for anyone who
          cannot scan one — and for the accessibility tree, where the code
          itself is decoration. */}
      <p className="gd-app-fallback">
        Or go to <Link href={APP_LINK_PATH}>godaisy.io/app</Link>
      </p>
    </section>
  );
}
