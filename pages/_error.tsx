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

      <main className="gd-doc gd-oops">
        <div className="gd-doc-inner">
          <p className="call-label gd-doc-kicker">{statusCode}</p>
          <h1 className="gd-doc-title">Something went wrong.</h1>
          <p>{statusCode === 500 ? 'Our server had a problem. It has been logged, and a moment from now it will probably work.' : `That request came back as a ${statusCode}. The page could not be served.`}</p>
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

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res?.statusCode || err?.statusCode || 500;
  return { statusCode };
};

export default Error;
