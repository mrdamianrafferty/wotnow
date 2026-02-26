import Link from 'next/link';
import Head from 'next/head';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

function Error({ statusCode }: { statusCode: number }) {
  useEffect(() => {
    Sentry.captureMessage(`Error ${statusCode}`, {
      level: 'error',
      tags: {
        app: 'godaisy',
        page: 'custom_error',
        status_code: String(statusCode),
      },
      extra: {
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    });
  }, [statusCode]);

  return (
    <>
      <Head>
        <title>{statusCode} - Error | Go Daisy</title>
        <meta name="description" content={`An error ${statusCode} occurred.`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-9xl font-bold text-error mb-4">{statusCode}</h1>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">Something Went Wrong</h2>
          <p className="text-lg text-base-content/70 mb-8">
            {statusCode === 500
              ? "We're experiencing server issues. Please try again in a moment."
              : `An error ${statusCode} occurred. The page you requested could not be served.`}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="btn btn-primary btn-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </Link>

            <Link href="/activities" className="btn btn-outline btn-lg">
              View Activities
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
    </>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res?.statusCode || err?.statusCode || 500;
  return { statusCode };
};

export default Error;
