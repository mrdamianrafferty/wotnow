import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase/client';
import { normalizeEmail, mapAuthError } from '../lib/auth/utils';
import Link from 'next/link';
import Head from 'next/head';
import { Cloud, Sun, Waves } from 'lucide-react';
import { signInWithApple } from '../lib/auth/appleSignIn';
import type { PluginListenerHandle } from '@capacitor/core';

export default function GoDaisyLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);

  // Get returnTo parameter for redirect after login
  const returnTo = router.query.returnTo as string | undefined;
  const destination = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('/findr') ? returnTo : '/';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;

      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      if (cancelled) return;
      setIsNativePlatform(true);

      const { App } = await import('@capacitor/app');

      nativeListenerRef.current = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url || !url.startsWith('godaisy://auth/callback')) {
          return;
        }

        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch (err) {
          console.warn('[Go Daisy Auth] Could not close browser:', err);
        }

        try {
          setLoading(true);

          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          if (!code) {
            throw new Error('No authorization code returned');
          }

          const { Preferences } = await import('@capacitor/preferences');
          const { value: codeVerifier } = await Preferences.get({ key: 'google_oauth_code_verifier' });
          if (!codeVerifier) {
            throw new Error('Could not resume Google Sign In. Please try again.');
          }

          const clientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
          if (!clientId) {
            throw new Error('Google Sign In is temporarily unavailable (client missing).');
          }

          const tokenResponse = await fetch('/api/auth/google-token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              codeVerifier,
              clientId,
              redirectUri: 'https://godaisy.io/auth/callback',
            }),
          });

          if (!tokenResponse.ok) {
            const payload = await tokenResponse.json().catch(() => ({}));
            throw new Error(payload.error || 'Could not complete Google Sign In');
          }

          const { idToken } = (await tokenResponse.json()) as { idToken: string };
          if (!idToken) {
            throw new Error('Missing ID token from Google');
          }

          const { error: supabaseError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (supabaseError) {
            throw supabaseError;
          }

          await Preferences.remove({ key: 'google_oauth_code_verifier' });

          const storedDestination = sessionStorage.getItem('oauth_origin');
          const redirectTarget = storedDestination && storedDestination.startsWith('/')
            ? storedDestination
            : destination;

          window.location.href = redirectTarget;
        } catch (err) {
          console.error('[Go Daisy Auth] Deep link handling failed:', err);
          setError(mapAuthError(err));
          setLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      nativeListenerRef.current?.remove?.();
      nativeListenerRef.current = null;
    };
  }, [destination]);

  const handleNativeGoogleSignIn = async () => {
    try {
      const { Browser } = await import('@capacitor/browser');
      const { Preferences } = await import('@capacitor/preferences');

      const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
      };

      const generateCodeChallenge = async (verifier: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return btoa(String.fromCharCode(...hashArray))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+/g, '');
      };

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      await Preferences.set({ key: 'google_oauth_code_verifier', value: codeVerifier });

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      if (!clientId) {
        throw new Error('GOOGLE_NOT_CONFIGURED');
      }

      const redirectUri = 'https://godaisy.io/auth/callback';
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('prompt', 'select_account');

      await Browser.open({ url: authUrl.toString(), presentationStyle: 'popover' });
    } catch (err) {
      throw err;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
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
            emailRedirectTo: `${window.location.origin}/auth/callback?app=godaisy`,
            data: {
              app: 'godaisy',
            },
          },
        });

        if (error) throw error;

        setMessage('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password,
        });

        if (error) throw error;

        // Redirect to returnTo or default to home
        router.push(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('/findr') ? returnTo : '/');
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      sessionStorage.setItem('oauth_origin', destination);
      sessionStorage.setItem('oauth_app', 'godaisy');

      if (isNativePlatform) {
        console.log('[Go Daisy Auth] Native platform detected for', provider);

        if (provider === 'apple') {
          await signInWithApple(supabase, `${window.location.origin}/auth/callback`);
          window.location.href = destination;
          return;
        }

        if (provider === 'google') {
          try {
            await handleNativeGoogleSignIn();
            return;
          } catch (nativeError) {
            if ((nativeError as Error)?.message === 'GOOGLE_NOT_CONFIGURED') {
              console.warn('[Go Daisy Auth] Google native flow not configured, falling back to web OAuth');
            } else {
              throw nativeError;
            }
          }
        }
      }

      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('[Go Daisy Auth] Starting OAuth:', {
        provider,
        origin: window.location.origin,
        redirectTo: redirectUrl,
        hostname: window.location.hostname
      });

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: provider === 'google' ? {
            prompt: 'select_account',
          } : undefined,
        },
      });

      if (authError) {
        throw authError;
      }

      console.log('[Go Daisy Auth] OAuth response:', { url: data.url, provider: data.provider });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[Go Daisy Auth] Error:', err);
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - Go Daisy</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center gap-2 mb-4">
                <Sun className="w-12 h-12 text-yellow-500" />
                <Cloud className="w-12 h-12 text-blue-400" />
                <Waves className="w-12 h-12 text-cyan-500" />
              </div>
              <h1 className="text-3xl font-bold text-primary">Go Daisy</h1>
              <p className="text-base-content/70 mt-2">
                {mode === 'signin' ? 'Welcome back!' : 'Join the outdoor adventure'}
              </p>
            </div>

            {/* Error/Success Messages */}
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

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="btn btn-outline btn-block gap-2 text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-400 bg-white disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="btn btn-outline btn-block gap-2 text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-400 bg-white disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="divider">OR</div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
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
                  disabled={loading}
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
                  disabled={loading}
                />
                {mode === 'signin' && (
                  <label className="label">
                    <Link href="/auth/reset" className="label-text-alt link link-hover">
                      Forgot password?
                    </Link>
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Loading...
                  </>
                ) : mode === 'signin' ? (
                  'Sign In'
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            {/* Toggle between signin/signup */}
            <div className="text-center mt-4">
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="link link-hover text-sm"
                disabled={loading}
              >
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
