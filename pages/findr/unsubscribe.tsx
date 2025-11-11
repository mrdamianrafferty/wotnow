/**
 * Email Unsubscribe Page
 *
 * Standalone page for one-click email unsubscribe.
 * Reads token from URL query parameter and calls unsubscribe API.
 * No authentication required - token provides secure access.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle, XCircle, Mail, Settings, Loader2 } from 'lucide-react';

type UnsubscribeState = 'loading' | 'success' | 'error' | 'invalid-token';

export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<UnsubscribeState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) return;

    // Call the unsubscribe API
    const unsubscribe = async () => {
      try {
        const response = await fetch(`/api/findr/unsubscribe?token=${encodeURIComponent(token as string)}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setState('success');
        } else if (response.status === 400 && data.error?.includes('Invalid or expired')) {
          setState('invalid-token');
          setErrorMessage(data.error);
        } else {
          setState('error');
          setErrorMessage(data.error || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('[Unsubscribe Page] Error:', error);
        setState('error');
        setErrorMessage('Failed to connect to server');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <>
      <Head>
        <title>Unsubscribe from Findr Emails</title>
        <meta name="description" content="Manage your fishing notification preferences" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body items-center text-center">
            {state === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h2 className="card-title text-2xl mb-2">Processing...</h2>
                <p className="text-base-content/70">
                  Updating your notification preferences
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-success mb-4" />
                <h2 className="card-title text-2xl mb-2">Successfully Unsubscribed</h2>
                <p className="text-base-content/70 mb-4">
                  You&apos;ve been removed from all Findr email notifications.
                </p>
                <div className="alert alert-info mb-4">
                  <Mail size={20} />
                  <span className="text-sm">
                    You&apos;ll no longer receive daily digests or weekly forecasts.
                    In-app notifications remain active.
                  </span>
                </div>
                <div className="card-actions flex-col w-full gap-2">
                  <Link href="/findr" className="btn btn-primary btn-block">
                    Return to Findr
                  </Link>
                  <Link href="/findr/favourites-auth" className="btn btn-ghost btn-block">
                    <Settings size={18} />
                    Manage All Settings
                  </Link>
                </div>
              </>
            )}

            {state === 'invalid-token' && (
              <>
                <XCircle className="w-16 h-16 text-warning mb-4" />
                <h2 className="card-title text-2xl mb-2">Invalid or Expired Link</h2>
                <p className="text-base-content/70 mb-4">
                  This unsubscribe link is no longer valid. It may have expired or already been used.
                </p>
                <div className="alert alert-warning mb-4">
                  <span className="text-sm">
                    {errorMessage || 'Please use a current unsubscribe link from a recent email.'}
                  </span>
                </div>
                <div className="card-actions flex-col w-full gap-2">
                  <Link href="/findr/auth" className="btn btn-primary btn-block">
                    Sign In to Manage Settings
                  </Link>
                  <Link href="/findr" className="btn btn-ghost btn-block">
                    Return to Findr
                  </Link>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <XCircle className="w-16 h-16 text-error mb-4" />
                <h2 className="card-title text-2xl mb-2">Something Went Wrong</h2>
                <p className="text-base-content/70 mb-4">
                  We couldn&apos;t process your unsubscribe request at this time.
                </p>
                <div className="alert alert-error mb-4">
                  <span className="text-sm">
                    {errorMessage || 'Please try again later or contact support.'}
                  </span>
                </div>
                <div className="card-actions flex-col w-full gap-2">
                  <button
                    onClick={() => router.reload()}
                    className="btn btn-primary btn-block"
                  >
                    Try Again
                  </button>
                  <Link href="/findr/auth" className="btn btn-ghost btn-block">
                    Sign In to Manage Settings
                  </Link>
                </div>
              </>
            )}

            {/* Help Footer */}
            <div className="divider" />
            <p className="text-xs text-base-content/50">
              Changed your mind?{' '}
              <Link href="/findr/auth" className="link link-primary">
                Sign in to re-enable emails
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
