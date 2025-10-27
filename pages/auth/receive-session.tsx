import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';
import Link from 'next/link';

/**
 * Session receiver page - runs on both godaisy.io and fishfindr.eu
 * Receives session tokens from shared auth callback and establishes local session
 *
 * Flow:
 * 1. Receive access_token and refresh_token from URL query params
 * 2. Call supabase.auth.setSession() to establish session on this domain
 * 3. Redirect to app's main page (/ for Go Daisy, /findr for Findr)
 */
export default function ReceiveSession() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Setting up your session...');

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        const access_token = router.query.access_token as string | undefined;
        const refresh_token = router.query.refresh_token as string | undefined;
        const expires_at = router.query.expires_at as string | undefined;

        console.log('[Receive Session] Started:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          expiresAt: expires_at,
          hostname: window.location.hostname,
        });

        if (!access_token || !refresh_token) {
          throw new Error('Missing session tokens. Please try signing in again.');
        }

        setStatus('Establishing session...');

        // Establish session on this domain (godaisy.io or fishfindr.eu)
        console.log('[Receive Session] Setting session on', window.location.hostname);
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error('[Receive Session] Session error:', sessionError);
          throw sessionError;
        }

        if (!data?.session) {
          throw new Error('Failed to establish session. Please try again.');
        }

        console.log('[Receive Session] Session established successfully:', {
          userEmail: data.session.user?.email,
          expiresAt: data.session.expires_at,
        });

        // Determine destination based on current domain
        const hostname = window.location.hostname;
        const isFindr = hostname.includes('fishfindr.eu') || hostname.includes('findr');
        const destination = isFindr ? '/findr' : '/';

        console.log('[Receive Session] Redirecting to:', destination);
        setStatus('Redirecting...');

        // Clean URL and redirect to app
        // Use replace to remove tokens from URL and prevent back button showing them
        router.replace(destination);
      } catch (err) {
        console.error('[Receive Session] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to establish session';
        setError(errorMessage);
        setStatus('Session setup failed');
      }
    })();
  }, [router.isReady, router.query, router]);

  // Determine which app we're on for error fallback links
  const isFindr = typeof window !== 'undefined' && (
    window.location.hostname.includes('fishfindr.eu') ||
    window.location.pathname.startsWith('/findr')
  );

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-center">{status}</h1>

      {!error && (
        <div className="flex flex-col items-center gap-3">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/70">
            Please wait while we set up your session...
          </p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Session Setup Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Link
              href={isFindr ? '/findr/auth' : '/login'}
              className="btn btn-primary btn-sm"
            >
              Try Again
            </Link>
            <Link
              href={isFindr ? '/findr' : '/'}
              className="btn btn-ghost btn-sm"
            >
              {isFindr ? 'Go to Findr' : 'Go to Home'}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

// Disable static generation - needs query params and dynamic routing
export async function getServerSideProps() {
  return { props: {} };
}
