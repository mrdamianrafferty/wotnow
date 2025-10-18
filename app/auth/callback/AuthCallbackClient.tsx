'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

// Unified authentication callback handler for Go Daisy and Findr
// Supports:
// 1) PKCE flow (modern, code-based OAuth and magic links)
// 2) Implicit flow (legacy, direct token access)
// 3) Email OTP links (magic link / signup confirm / recovery / invite / email change)
//
// Intelligently routes users based on app context after successful authentication.

enum Phase { Checking, Done, Error }

type EmailOtpType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite';

function asEmailOtpType(t: string | null): EmailOtpType {
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

export default function AuthCallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const typeParam = sp?.get('type');
  const tokenHash = sp?.get('token_hash') || sp?.get('token');
  const oauthError = sp?.get('error') || sp?.get('error_description');

  // Check for additional Supabase parameters
  const code = sp?.get('code');
  const access_token = sp?.get('access_token');
  const refresh_token = sp?.get('refresh_token');

  // Get routing context
  const returnTo = sp?.get('returnTo') || sp?.get('redirect_to');
  const app = sp?.get('app');

  const [phase, setPhase] = useState<Phase>(Phase.Checking);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Debug: Log all search parameters
        console.log('Auth callback params:', {
          type: typeParam,
          token_hash: tokenHash,
          code: code,
          access_token: access_token ? '[PRESENT]' : null,
          refresh_token: refresh_token ? '[PRESENT]' : null,
          error: oauthError,
          all_params: Object.fromEntries(sp?.entries() || [])
        });

        // If the provider redirected with an explicit error, surface it.
        if (oauthError) {
          throw new Error(oauthError);
        }

        // Handle PKCE flow (newer Supabase magic links and OAuth)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Success - route to appropriate destination
          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          router.replace(destination);
          return;
        }

        // Handle implicit flow tokens (older style OAuth)
        if (access_token) {
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

          router.replace(destination);
          return;
        }

        // Email OTP / magic link style flows (legacy token_hash)
        if (tokenHash) {
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

          router.replace(destination);
          return;
        }

        // OAuth implicit – session should already be present (fallback)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setPhase(Phase.Done);
          const destination = getDestination({
            returnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
          });

          router.replace(destination);
          return;
        }

        // If we get here, parameters are missing or the session isn't ready
        throw new Error('Missing or invalid parameters.');
      } catch (e: unknown) {
        setError(getErrorMessage(e));
        setPhase(Phase.Error);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4" data-theme="light">
      <h1 className="text-2xl font-semibold text-center">Signing you in…</h1>

      {phase === Phase.Checking && (
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-dots loading-md" aria-hidden="true"></span>
          <p className="text-sm text-base-content/70">Please wait while we complete your sign-in.</p>
        </div>
      )}

      {phase === Phase.Error && (
        <div className="alert alert-error flex items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <Link href="/login" className="btn btn-sm">Back to login</Link>
        </div>
      )}
    </main>
  );
}
