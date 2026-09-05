/**
 * Where the QR codes land — phase 6.
 *
 * Every spot page prints a QR, and a QR outlives whatever it encodes: it gets
 * screenshotted, printed, stuck in a window. Encoding the App Store URL
 * directly would mean every code already in the world goes stale the day a
 * Play listing exists or a territory changes. This page is the indirection, and
 * it is the only thing the codes ever have to know.
 *
 * It also does what a store URL cannot: route by platform. An Android phone
 * scanning an App Store link gets an apology; here it gets the web app, which
 * works today.
 *
 * The redirect is CLIENT-SIDE ON PURPOSE. A server redirect keyed on
 * User-Agent would be cached by the CDN and then served to the wrong platform —
 * the classic version of this bug, where the first visitor's phone decides
 * where everyone goes. Rendering a real page and moving from there costs a
 * frame and cannot be miscached.
 *
 * @module pages/app
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { APP_STORE_URL, APP_STORE_NAME } from '@/lib/daisyFamily';

type Platform = 'ios' | 'android' | 'other';

function detect(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; the touch-point count is what gives it
  // away, and an iPad should get the App Store like any other iOS device.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPod|iPad/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export default function AppPage() {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    const p = detect();
    setPlatform(p);
    // Only iOS auto-forwards: it is the only platform with somewhere to go.
    // `replace`, so the back button returns to whatever they scanned from
    // rather than bouncing them straight back out to the App Store.
    if (p === 'ios') window.location.replace(APP_STORE_URL);
  }, []);

  return (
    <>
      <Head>
        <title>Get Go Daisy</title>
        {/* Not indexed: this is a doorway for QR codes, and a doorway page is
            exactly what search engines are right to ignore. */}
        <meta name="robots" content="noindex" />
      </Head>
      <main className="call-setup">
        <div className="call-setup-inner">
          <p className="call-label">Go Daisy</p>
          <h1 className="call-setup-question">
            {platform === 'ios' ? 'Taking you to the App Store…' : 'Get Go Daisy'}
          </h1>

          {platform === 'android' && (
            <p className="call-setup-help">
              The Android app is not out yet. The web app does everything the phone app
              does — add it to your home screen and it behaves like one.
            </p>
          )}
          {platform === 'other' && (
            <p className="call-setup-help">
              {APP_STORE_NAME} is on iPhone and iPad. On anything else, the web app does
              the same job.
            </p>
          )}

          <div className="call-setup-actions call-app-actions">
            {platform !== 'android' && (
              <a className="call-btn call-setup-next" href={APP_STORE_URL}>
                Open the App Store
              </a>
            )}
            <Link className="call-setup-back" href="/call">
              Use it in the browser
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
