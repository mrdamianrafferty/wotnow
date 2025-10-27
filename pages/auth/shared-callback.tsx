import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';
import Link from 'next/link';

/**
 * Shared OAuth callback handler hosted on auth.godaisy.io
 * Handles OAuth code exchange and redirects back to originating app with session tokens
 *
 * Flow:
 * 1. OAuth provider redirects here with authorization code
 * 2. Exchange code for session (no CORS - we're on auth.godaisy.io)
 * 3. Extract session tokens
 * 4. Redirect to originating app (from sessionStorage) with tokens in URL
 * 5. Originating app receives tokens and establishes local session
 */
export default function SharedCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Completing sign in...');

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        const code = router.query.code as string | undefined;
        const error_description = router.query.error_description as string | undefined;

        console.log('[Shared Callback] Started:', {
          hasCode: !!code,
          hasError: !!error_description,
          url: window.location.href,
        });

        // Check for OAuth errors from provider
        if (error_description) {
          throw new Error(error_description);
        }

        if (!code) {
          throw new Error('No authorization code received from provider');
        }

        setStatus('Exchanging authorization code...');

        // Exchange code for session (this works because we're on auth.godaisy.io - matches Supabase Site URL)
        console.log('[Shared Callback] Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[Shared Callback] Exchange error:', exchangeError);
          throw exchangeError;
        }

        if (!data?.session) {
          throw new Error('No session created after code exchange');
        }

        console.log('[Shared Callback] Session created successfully:', {
          userEmail: data.session.user?.email,
          expiresAt: data.session.expires_at,
        });

        // Get return destination from sessionStorage (set by shared-login page)
        const returnTo = sessionStorage.getItem('auth_return_to');
        const app = sessionStorage.getItem('auth_app');

        console.log('[Shared Callback] Return destination:', { returnTo, app });

        // Clean up sessionStorage
        sessionStorage.removeItem('auth_return_to');
        sessionStorage.removeItem('auth_app');

        if (!returnTo) {
          // Fallback if returnTo not stored (shouldn't happen)
          const fallbackUrl = app === 'findr'
            ? 'https://fishfindr.eu/findr'
            : 'https://godaisy.io/';
          console.warn('[Shared Callback] No returnTo found, using fallback:', fallbackUrl);
          window.location.replace(fallbackUrl);
          return;
        }

        setStatus('Redirecting to app...');

        // Construct return URL with session tokens as query params
        // The destination app will receive these and call setSession()
        const returnUrl = new URL(returnTo);
        returnUrl.searchParams.set('access_token', data.session.access_token);
        returnUrl.searchParams.set('refresh_token', data.session.refresh_token);
        returnUrl.searchParams.set('expires_at', data.session.expires_at?.toString() || '');
        returnUrl.searchParams.set('token_type', data.session.token_type || 'bearer');

        console.log('[Shared Callback] Redirecting to:', returnUrl.toString().replace(/token=[^&]+/g, 'token=***'));

        // Redirect to destination app with tokens
        window.location.replace(returnUrl.toString());
      } catch (err) {
        console.error('[Shared Callback] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setStatus('Authentication failed');
      }
    })();
  }, [router.isReady, router.query]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-center">{status}</h1>

      {!error && (
        <div className="flex flex-col items-center gap-3">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/70">Please wait while we complete your sign in...</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Authentication Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Link
              href="/auth/shared-login?app=findr&returnTo=https://fishfindr.eu/auth/receive-session"
              className="btn btn-primary btn-sm"
            >
              Try Findr Again
            </Link>
            <Link
              href="/auth/shared-login?app=godaisy&returnTo=https://godaisy.io/auth/receive-session"
              className="btn btn-ghost btn-sm"
            >
              Try Go Daisy
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

// Disable static generation - needs query params
export async function getServerSideProps() {
  return { props: {} };
}
