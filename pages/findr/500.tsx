// pages/findr/500.tsx - Findr 500 Page
import Link from 'next/link';
import Head from 'next/head';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import FindrHeader from '../../components/findr/FindrHeader';
import FindrFooter from '../../components/FindrFooter';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';

export default function Findr500() {
  useEffect(() => {
    // Log 500 error to Sentry
    Sentry.captureMessage('500 Internal Server Error Page Shown', {
      level: 'error',
      tags: {
        app: 'findr',
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
        <title>500 - Server Error | Findr</title>
        <meta name="description" content="Something went wrong on our end." />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content flex flex-col">
        <FindrHeader />

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-lg">
            {/* Error Code */}
            <h1 className="text-9xl font-bold text-error mb-4">500</h1>

            {/* Message */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <TranslatedText text="Something Went Wrong" />
            </h2>
            <p className="text-lg text-base-content/70 mb-8">
              <TranslatedText text="We're experiencing technical difficulties. Our team has been notified and is working on a fix." />
            </p>

            {/* Status Message */}
            <div className="alert alert-warning mb-8 max-w-md mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <TranslatedText text="The error has been logged and we'll fix it soon." />
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary btn-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <TranslatedText text="Try Again" />
              </button>

              <Link href="/findr" className="btn btn-outline btn-lg">
                <TranslatedText text="Go to Predictions" />
              </Link>
            </div>

            {/* Help Text */}
            <p className="mt-8 text-sm text-base-content/60">
              <TranslatedText text="Still having issues?" />{' '}
              <a href="mailto:hello@fishfindr.eu" className="link link-secondary">
                <TranslatedText text="Contact support" />
              </a>
            </p>
          </div>
        </main>

        <FindrFooter />
      </div>
    </>
  );
}
