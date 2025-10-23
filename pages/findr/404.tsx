// pages/findr/404.tsx - Findr 404 Page
import Link from 'next/link';
import Head from 'next/head';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import FindrHeader from '../../components/findr/FindrHeader';
import FindrFooter from '../../components/FindrFooter';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';

export default function Findr404() {
  useEffect(() => {
    // Log 404 to Sentry for monitoring
    Sentry.captureMessage('404 Page Not Found', {
      level: 'info',
      tags: {
        app: 'findr',
        page: 'custom_404',
      },
      extra: {
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    });
  }, []);

  return (
    <>
      <Head>
        <title>404 - Page Not Found | Findr</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content flex flex-col">
        <FindrHeader />

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-lg">
            {/* Error Code */}
            <h1 className="text-9xl font-bold text-secondary mb-4">404</h1>

            {/* Message */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <TranslatedText text="Page Not Found" />
            </h2>
            <p className="text-lg text-base-content/70 mb-8">
              <TranslatedText text="Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist." />
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/findr" className="btn btn-secondary btn-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <TranslatedText text="Go to Predictions" />
              </Link>

              <Link href="/findr/favourites" className="btn btn-outline btn-lg">
                <TranslatedText text="View Favourites" />
              </Link>
            </div>

            {/* Help Text */}
            <p className="mt-8 text-sm text-base-content/60">
              <TranslatedText text="Need help?" />{' '}
              <a href="mailto:hello@fishfindr.eu" className="link link-secondary">
                <TranslatedText text="Contact us" />
              </a>
            </p>
          </div>
        </main>

        <FindrFooter />
      </div>
    </>
  );
}
