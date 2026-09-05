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
        <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 flex items-center justify-center px-4">
          <div className="text-center max-w-lg">
            <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Page Not Found</h2>
            <p className="text-lg text-base-content/70 mb-8">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn btn-primary btn-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go Home
              </Link>

              <Link href="/weather" className="btn btn-outline btn-lg">
                Today&rsquo;s conditions
              </Link>
            </div>

            <p className="mt-8 text-sm text-base-content/60">
              Need help?{' '}
              <a href="mailto:hello@godaisy.io" className="link link-primary">
                Contact us
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
