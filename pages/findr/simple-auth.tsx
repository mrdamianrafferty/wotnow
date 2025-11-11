import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Fish } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { normalizeEmail, mapAuthError, validateAndCleanSession } from '../../lib/auth/utils';
import { registerPushNotifications } from '../../lib/findr/pushNotifications';

export default function SimpleAuth() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check if user is already signed in and validate session
  useEffect(() => {
    let isSubscribed = true;

    // Validate and check session
    validateAndCleanSession(supabase).then(async (hasValidSession) => {
      if (isSubscribed && hasValidSession) {
        // Register for push notifications (iOS only, non-blocking)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          registerPushNotifications(user.id).catch(err => {
            console.error('[Auth] Failed to register push notifications:', err);
          });
        }
        router.push('/findr');
      }
    });

    // Listen for auth state changes (but don't double-redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isSubscribed && event === 'SIGNED_IN' && session) {
        // Register for push notifications (iOS only, non-blocking)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          registerPushNotifications(user.id).catch(err => {
            console.error('[Auth] Failed to register push notifications:', err);
          });
        }

        // Small delay to prevent race condition with manual redirect
        setTimeout(() => {
          if (isSubscribed) router.push('/findr');
        }, 100);
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const emailNorm = normalizeEmail(email);

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: emailNorm,
          password,
          options: {
            data: {
              app: 'findr',
            },
          },
        });
        if (error) throw error;
        setMessage('Check your email for confirmation link!');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password,
        });
        if (error) throw error;
        // Will be redirected by auth state change
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const emailNorm = normalizeEmail(email);
      const { error } = await supabase.auth.signInWithOtp({
        email: emailNorm,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?app=findr`,
        },
      });
      if (error) throw error;
      setMessage('Check your email for a magic sign-in link! 🪄');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const emailNorm = normalizeEmail(email);
      // Use magic link for "password reset" - simpler and more reliable
      const { error } = await supabase.auth.signInWithOtp({
        email: emailNorm,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?app=findr`,
        },
      });
      if (error) throw error;
      setMessage('Check your email for a sign-in link! No password needed. 🎣');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - findr</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Fish className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">findr</h1>
              <p className="text-base-content/70 mt-2">
                {mode === 'signin' && 'Sign in to your account'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'reset' && 'Get a sign-in link'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="alert alert-success mb-4">
                <span>{message}</span>
              </div>
            )}

            {mode !== 'reset' ? (
              <form onSubmit={handleEmailPassword} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="input input-bordered"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    mode === 'signin' ? 'Sign In' : 'Sign Up'
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="input input-bordered"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  onClick={handlePasswordReset}
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    '🪄 Send Magic Link'
                  )}
                </button>
              </div>
            )}

            <div className="divider">OR</div>

            {mode !== 'reset' && (
              <button
                onClick={handleMagicLink}
                className="btn btn-outline btn-block"
                disabled={loading}
              >
                🪄 Send Magic Link (No Password)
              </button>
            )}

            <div className="text-center space-y-2 mt-4">
              {mode === 'signin' && (
                <>
                  <p className="text-sm">
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="link link-primary"
                    >
                      Need an account? Sign up
                    </button>
                  </p>
                  <p className="text-sm">
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="link link-primary"
                    >
                      Forgot password?
                    </button>
                  </p>
                </>
              )}

              {mode === 'signup' && (
                <p className="text-sm">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="link link-primary"
                  >
                    Already have an account? Sign in
                  </button>
                </p>
              )}

              {mode === 'reset' && (
                <p className="text-sm">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="link link-primary"
                  >
                    ← Back to sign in
                  </button>
                </p>
              )}
            </div>

            <div className="text-center mt-6">
              <Link href="/findr" className="link link-primary text-sm">
                ← Continue without account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// Disable static generation for auth page
export async function getServerSideProps() {
  return { props: {} };
}
