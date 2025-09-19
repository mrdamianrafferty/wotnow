'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

enum Phase { Checking, NeedPassword, Updating, Done, Error }

type EmailOtpType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Something went wrong';
}

function asEmailOtpType(t: string | null): EmailOtpType {
  switch ((t || '').toLowerCase()) {
    case 'signup':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'invite':
      return (t as EmailOtpType) || 'magiclink';
    default:
      return 'magiclink';
  }
}

export default function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp?.get('type');
  const code = sp?.get('code');
  const tokenHash = sp?.get('token_hash') || sp?.get('token');
  const wantSetPassword = sp?.get('set_password') === '1';

  const [phase, setPhase] = useState<Phase>(Phase.Checking);
  const [error, setError] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [pkceIssue, setPkceIssue] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const isPkceVerifierError = (m?: string) =>
      /code verifier/i.test(m || '') || /both auth code and code verifier/i.test(m || '');

    (async () => {
      try {
        // 1) Email OTP flows first: recovery, magiclink, invite, email change
        if (tokenHash) {
          const otpType = asEmailOtpType(type);
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;

          // If we explicitly asked to set a password after a magic link, show the password form
          if (wantSetPassword) {
            setPhase(Phase.NeedPassword);
            return;
          }

          if ((type || '').toLowerCase() === 'recovery') {
            // After verifyOtp for recovery, prompt user to set a new password
            setPhase(Phase.NeedPassword);
            return;
          }

          setPhase(Phase.Done);
          router.replace('/');
          return;
        }

        // 2) OAuth/PKCE exchange (requires stored code_verifier from same origin/browser)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            const msg = getErrorMessage(error);
            if (isPkceVerifierError(msg)) {
              setPkceIssue(true);
              setError(
                "This link can't be completed in this browser tab (missing code verifier). Open it in the same browser you used to start login, or request a fresh link from the login page."
              );
              setPhase(Phase.Error);
              return;
            }
            throw error;
          }
          setPhase(Phase.Done);
          router.replace('/');
          return;
        }

        // No recognised params
        setError('Nothing to process on this URL. Try starting again from the login page.');
        setPhase(Phase.Error);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
        setPhase(Phase.Error);
      }
    })();
  }, [tokenHash, code, type, router, wantSetPassword]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      setError(getErrorMessage(error));
      setPhase(Phase.Error);
      return;
    }
    setPhase(Phase.Done);
    router.replace('/');
  }

  async function resendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setSaving(false);
    if (error) {
      setError(getErrorMessage(error));
      setPhase(Phase.Error);
      return;
    }
    setError("We've sent you a new reset e‑mail. Please open it in this same browser.");
    setPhase(Phase.Error);
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4" data-theme="light">
      <h1 className="text-2xl font-semibold text-center">Finishing sign‑in…</h1>

      {phase === Phase.Checking && <div className="alert alert-info">Working on it…</div>}

      {phase === Phase.NeedPassword && (
        <form onSubmit={savePassword} className="space-y-3">
          <div className="alert alert-info">Set a new password to finish your reset.</div>
          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="New password"
            minLength={6}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            required
          />
          <button className="btn btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}

      {phase === Phase.Error && (
        <div className="space-y-4">
          <div className="alert alert-error flex items-center justify-between gap-3">
            <span>{error}</span>
            <a className="btn btn-sm" href="/login">Back to login</a>
          </div>

          {pkceIssue && (
            <form onSubmit={resendReset} className="card bg-base-100 border border-base-300">
              <div className="card-body gap-2">
                <p className="text-sm">
                  If you requested a password reset from another device or browser, the link may not include the required
                  verifier. Enter your e‑mail below and we’ll send a fresh link — open it <strong>in this browser</strong>.
                </p>
                <input
                  className="input input-bordered w-full"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Sending…' : 'Send new reset link'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
