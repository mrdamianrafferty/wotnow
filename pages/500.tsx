// pages/500.tsx - Go Daisy 500 Page
import Link from 'next/link';
import Head from 'next/head';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Custom500() {
  useEffect(() => {
    // Log 500 error to Sentry
    Sentry.captureMessage('500 Internal Server Error Page Shown', {
      level: 'error',
      tags: {
        app: 'godaisy',
        page: 'custom_500',
      },
      extra: {
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    });
  }, []);

  return (
    <>
      <Head>
        <title>500 - Server Error | Go Daisy</title>
        <meta name="description" content="Something went wrong on our end." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* Error Code */}
          <h1 className="text-9xl font-bold text-error mb-4">500</h1>

          {/* Message */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Something Went Wrong</h2>
          <p className="text-lg text-base-content/70 mb-8">
            We&apos;re experiencing technical difficulties. Our team has been notified and is working on a fix.
          </p>

          {/* Status Message */}
          <div className="alert alert-warning mb-8 max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>The error has been logged and we&apos;ll fix it soon.</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>

            <Link href="/" className="btn btn-outline btn-lg">
              Go Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="mt-8 text-sm text-base-content/60">
            Still having issues?{' '}
            <a href="mailto:hello@godaisy.io" className="link link-primary">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
