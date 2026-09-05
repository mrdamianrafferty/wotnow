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

      <main className="gd-doc gd-oops">
        <div className="gd-doc-inner">
          <p className="call-label gd-doc-kicker">500</p>
          <h1 className="gd-doc-title">Something went wrong at our end.</h1>
          <p>It has been logged and we are on it. This is not something you did, and trying again in a moment usually works.</p>
          <div className="gd-oops-actions">
            <button type="button" className="gd-btn" onClick={() => window.location.reload()}>Try again</button>
            <Link href="/" className="gd-btn gd-btn--quiet">Today&rsquo;s call</Link>
          </div>
          <p className="gd-doc-updated">
            Still broken? <a href="mailto:hello@godaisy.io">Tell us</a>.
          </p>
        </div>
      </main>
    </>
  );
}
