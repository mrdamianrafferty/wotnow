import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';

// Unified authentication callback handler for Go Daisy and Findr
// Supports:
// 1) PKCE flow (modern, code-based OAuth and magic links)
// 2) Implicit flow (legacy, direct token access)
// 3) Email OTP links (magic link / signup confirm / recovery / invite / email change)

enum Phase { Checking, Done, Error }

type EmailOtpType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite';

function asEmailOtpType(t: string | null | undefined): EmailOtpType {
  switch ((t || '').toLowerCase()) {
    case 'signup':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'invite':
      return t as EmailOtpType;
    default:
      return 'magiclink';
  }
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'That link could not be used. Please start again from the login page.';
}

// Determine the correct destination based on context
function getDestination(params: {
  returnTo?: string | null;
  app?: string | null;
  isRecovery: boolean;
  hostname: string;
}): string {
  const { returnTo, app, isRecovery, hostname } = params;

  // If this is a recovery flow, send to appropriate password update page
  if (isRecovery) {
    const isFindrFlow = app === 'findr' || hostname.includes('fishfindr.eu');
    return isFindrFlow ? '/findr/update-password' : '/auth/reset';
  }

  // If returnTo is specified and safe, use it
  if (returnTo) {
    // Validate returnTo is same-origin and safe
    try {
      const url = new URL(returnTo, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash;
      }
    } catch {
      // Invalid URL, fall through to defaults
    }
  }

  // Determine app context
  const isFindrFlow = app === 'findr' || hostname.includes('fishfindr.eu');

  return isFindrFlow ? '/findr' : '/';
}

export default function AuthCallback() {
  const router = useRouter();
  const { query } = router;

  const [phase, setPhase] = useState<Phase>(Phase.Checking);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const typeParam = query.type as string | undefined;
    const tokenHash = (query.token_hash as string) || (query.token as string);
    const oauthError = (query.error as string) || (query.error_description as string);
    const code = query.code as string | undefined;
    const access_token = query.access_token as string | undefined;
    const refresh_token = query.refresh_token as string | undefined;
    const returnTo = (query.returnTo as string) || (query.redirect_to as string);
    const app = query.app as string | undefined;

    (async () => {
      try {
        // Debug: Log all query parameters
        console.log('Auth callback params:', {
          type: typeParam,
          token_hash: tokenHash,
          code: code,
          access_token: access_token ? '[PRESENT]' : null,
          refresh_token: refresh_token ? '[PRESENT]' : null,
          error: oauthError,
          app,
          returnTo,
        });

        // If the provider redirected with an explicit error, surface it.
        if (oauthError) {
          throw new Error(oauthError);
        }

        // Handle PKCE flow (newer Supabase magic links and OAuth)
        if (code) {
          console.log('Exchanging code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          console.log('Code exchange successful');
          // Success - route to appropriate destination
          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          console.log('Redirecting to:', destination);
          router.replace(destination);
          return;
        }

        // Handle implicit flow tokens (older style OAuth)
        if (access_token) {
          console.log('Setting session from implicit flow tokens...');
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
          });
          if (error) throw error;

          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          console.log('Redirecting to:', destination);
          router.replace(destination);
          return;
        }

        // Email OTP / magic link style flows (legacy token_hash)
        if (tokenHash) {
          console.log('Verifying OTP token...');
          const otpType = asEmailOtpType(typeParam);
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;

          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          console.log('Redirecting to:', destination);
          router.replace(destination);
          return;
        }

        // OAuth implicit – session should already be present (fallback)
        console.log('Checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Session found');
          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          console.log('Redirecting to:', destination);
          router.replace(destination);
          return;
        }

        // If we get here, parameters are missing or the session isn't ready
        throw new Error('Missing or invalid parameters.');
      } catch (e: unknown) {
        console.error('Auth callback error:', e);
        setError(getErrorMessage(e));
        setPhase(Phase.Error);
      }
    })();
  }, [router.isReady, router, query]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-center">Signing you in…</h1>

      {phase === Phase.Checking && (
        <div className="flex flex-col items-center gap-3">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/70">Please wait while we verify your authentication...</p>
        </div>
      )}

      {phase === Phase.Error && (
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
            <Link href="/findr/auth" className="btn btn-primary btn-sm">
              Try Again
            </Link>
            <Link href="/findr" className="btn btn-ghost btn-sm">
              Go to Findr
            </Link>
          </div>
        </div>
      )}

      {phase === Phase.Done && (
        <div className="flex flex-col items-center gap-3">
          <svg className="w-16 h-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-success font-medium">Success! Redirecting...</p>
        </div>
      )}
    </main>
  );
}
