/**
 * Where the QR codes land — phase 6.
 *
 * Every spot page prints a QR, and a QR outlives whatever it encodes: it gets
 * screenshotted, printed, stuck in a window. Encoding the App Store URL
 * directly would mean every code already in the world goes stale the day a
 * Play listing exists or a territory changes. This page is the indirection, and
 * it is the only thing the codes ever have to know.
 *
 * It also does what a store URL cannot: route by platform. iOS goes to the App
 * Store, Android to Google Play, and anything else is offered both plus the
 * web app.
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
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/daisyFamily';

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
    // Phones auto-forward to their own store. `replace`, so the back button
    // returns to whatever they scanned from rather than bouncing them straight
    // back out to the store.
    if (p === 'ios') window.location.replace(APP_STORE_URL);
    if (p === 'android') window.location.replace(PLAY_STORE_URL);
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
            {platform === 'ios'
              ? 'Taking you to the App Store…'
              : platform === 'android'
                ? 'Taking you to Google Play…'
                : 'Get Go Daisy'}
          </h1>

          {platform === 'other' && (
            <p className="call-setup-help">
              Go Daisy is on iPhone, iPad and Android. On anything else, the web app
              does the same job.
            </p>
          )}

          <div className="call-setup-actions call-app-actions">
            {platform !== 'android' && (
              <a className="call-btn call-setup-next" href={APP_STORE_URL}>
                Open the App Store
              </a>
            )}
            {platform !== 'ios' && (
              <a className="call-btn call-setup-next" href={PLAY_STORE_URL}>
                Open Google Play
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
