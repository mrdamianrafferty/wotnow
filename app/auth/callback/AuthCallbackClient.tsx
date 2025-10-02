'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Ultra-lightweight callback handler. It supports:
// 1) Email OTP links (magic link / signup confirm / recovery / invite / email change)
// 2) OAuth implicit flow (Google / Apple) – session is already set by Supabase
//
// We purposefully avoid complex returnTo / PKCE code-exchange handling
// to reduce edge cases ("wrong tab", code verifier missing, etc.).
// On success we always send people to the homepage.

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

export default function AuthCallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const typeParam = sp?.get('type');
  const tokenHash = sp?.get('token_hash') || sp?.get('token');
  const oauthError = sp?.get('error') || sp?.get('error_description');

  const [phase, setPhase] = useState<Phase>(Phase.Checking);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // If the provider redirected with an explicit error, surface it.
        if (oauthError) {
          throw new Error(oauthError);
        }

        // Email OTP / magic link style flows
        if (tokenHash) {
          const otpType = asEmailOtpType(typeParam);
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;

          // If this was a recovery flow, send user to reset page after session is established
          if ((typeParam || '').toLowerCase() === 'recovery') {
            setPhase(Phase.Done);
            router.replace('/auth/reset');
            return;
          }

          // Success – check for returnTo parameter, otherwise go to findr
          setPhase(Phase.Done);
          const returnTo = sp?.get('returnTo') || sp?.get('redirect_to');
          const destination = returnTo || '/findr';
          router.replace(destination);
          return;
        }

        // OAuth implicit – session should already be present
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setPhase(Phase.Done);
          
          // Check for returnTo parameter, otherwise redirect to /findr for findr users
          const returnTo = sp?.get('returnTo') || sp?.get('redirect_to');
          const destination = returnTo || '/findr';
          
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
          <a className="btn btn-sm" href="/login">Back to login</a>
        </div>
      )}
    </main>
  );
}
