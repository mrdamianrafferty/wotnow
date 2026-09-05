// pages/404.tsx - Go Daisy 404 Page
import Link from 'next/link';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Custom404() {
  const [isGrow404, setIsGrow404] = useState(false);

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
    const isGrowHost = hostname === 'grow.godaisy.io';
    const isGrowPath = pathname.startsWith('/grow');
    const growContext = isGrowHost || isGrowPath;

    setIsGrow404(growContext);

    // Log 404 to Sentry for monitoring
    Sentry.captureMessage('404 Page Not Found', {
      level: 'info',
      tags: {
        app: growContext ? 'growdaisy' : 'godaisy',
        page: 'custom_404',
      },
      extra: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        hostname,
        pathname,
      },
    });
  }, []);

  return (
    <>
      <Head>
        <title>{isGrow404 ? '404 - Lost in the Jungle | Grow Daisy' : '404 - Page Not Found | Go Daisy'}</title>
        <meta
          name="description"
          content={isGrow404 ? 'Oops! This vine leads nowhere. Head back to your Grow Daisy garden.' : "The page you're looking for doesn't exist."}
        />
      </Head>

      {isGrow404 ? (
        <div className="min-h-screen bg-gradient-to-b from-base-200 via-base-100 to-base-200 flex items-center justify-center px-4 py-10">
          <div className="card w-full max-w-3xl bg-base-100 shadow-xl border border-base-300">
            <div className="card-body text-center gap-6">
              <div className="flex flex-wrap items-center justify-center gap-2 text-2xl" aria-hidden="true">
                <span>🌿</span>
                <span>🪴</span>
                <span>🌺</span>
                <span>🌴</span>
                <span>🍄</span>
                <span>🦋</span>
              </div>

              <div>
                <div className="badge badge-success badge-lg mb-4">Grow Daisy Jungle Alert</div>
                <h1 className="text-7xl md:text-8xl font-black text-success leading-none">404</h1>
                <h2 className="text-3xl md:text-4xl font-bold mt-3">You took a wrong turn at Monstera Falls</h2>
                <p className="text-lg text-base-content/70 mt-4 max-w-2xl mx-auto">
                  This trail is all vines and no page. A mischievous fern probably moved it while you were looking at tomatoes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto w-full">
                <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🌱 No page found</div>
                <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🧭 Navigation repotted</div>
                <div className="badge badge-outline badge-lg h-auto py-3 justify-center">🌸 Fun levels blooming</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/grow" className="btn btn-success btn-lg">
                  Back to Garden HQ
                </Link>
                <Link href="/grow/plan" className="btn btn-outline btn-lg">
                  Open My Plan
                </Link>
                <Link href="/grow/weather" className="btn btn-outline btn-lg">
                  Check Garden Weather
                </Link>
              </div>

              <p className="text-sm text-base-content/60">
                Still stuck in the undergrowth?{' '}
                <a href="mailto:hello@godaisy.io" className="link link-success">
                  Call the plant rescue team
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      ) : (
        /*
         * THE GO DAISY 404, IN THE NEW DESIGN.
         *
         * A giant "404" in the DaisyUI primary over a `base-200` gradient, with
         * "Go Home" and a house icon. The number is the least useful thing on
         * the page — nobody arrives here wanting a status code — so the
         * sentence leads and the number is a quiet label above it, the same
         * shape as the kicker on the call.
         */
        <main className="gd-doc gd-oops">
          <div className="gd-doc-inner">
            <p className="call-label gd-doc-kicker">404</p>
            <h1 className="gd-doc-title">There is nothing here.</h1>
            <p>
              That page has either moved or never existed. Neither is your
              fault, and the forecast is still fine.
            </p>
            <div className="gd-oops-actions">
              <Link href="/" className="gd-btn">Today&rsquo;s call</Link>
              <Link href="/weather" className="gd-btn gd-btn--quiet">The conditions</Link>
            </div>
            <p className="gd-doc-updated">
              Something we broke?{' '}
              <a href="mailto:hello@godaisy.io">Tell us</a>.
            </p>
          </div>
        </main>
      )}
    </>
  );
}
