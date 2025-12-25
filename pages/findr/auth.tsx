import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { mapAuthError } from '../../lib/auth/utils';
import Link from 'next/link';
import Head from 'next/head';
import { Fish } from 'lucide-react';
import { signInWithApple } from '../../lib/auth/appleSignIn';
import { signInWithGoogleNative, GOOGLE_NATIVE_ERRORS } from '../../lib/auth/googleNative';

export default function FindrAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Detect if we're on a native platform
  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setIsNativePlatform(Capacitor.isNativePlatform());
        setIsAndroid(Capacitor.getPlatform() === 'android');
      } catch (_e) {
        // Not on native platform
      }
    })();
  }, []);

  // Detect if we're running as a PWA (standalone mode)
  useEffect(() => {
    const checkPWA = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true;
      setIsPWA(isPWAMode);
    };
    checkPWA();
  }, []);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      // On native platforms, use native sign in
      if (isNativePlatform) {
        if (provider === 'apple') {
          await signInWithApple(supabase);
          window.location.href = '/findr';
          return;
        } else if (provider === 'google') {
          try {
            await signInWithGoogleNative(supabase);
            window.location.href = '/findr';
            return;
          } catch (googleError: unknown) {
            const message = (googleError as Error)?.message;
            if (message === GOOGLE_NATIVE_ERRORS.CANCELLED) {
              setLoading(false);
              return;
            }
            if (message === GOOGLE_NATIVE_ERRORS.NOT_AVAILABLE || message === GOOGLE_NATIVE_ERRORS.NOT_CONFIGURED) {
              // Continue to web flow below
            } else {
              throw googleError;
            }
          }
        }
      }

      // Web platform: use standard OAuth flow

      // Store destination for callback page
      sessionStorage.setItem('oauth_origin', '/findr');
      sessionStorage.setItem('oauth_app', 'findr');

      // Start OAuth directly from current domain (no cross-domain redirect)
      const redirectUrl = `${window.location.origin}/auth/callback`;

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

      // Redirect to OAuth provider (SSR client doesn't auto-redirect)
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[Findr Auth] Error:', err);
      setError(mapAuthError(err));
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
                Sign in to access your fishing predictions
              </p>
            </div>

            {/* Error Messages */}
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {/* Social Login Buttons */}
            <div className="space-y-3">
              {isPWA ? (
                /* PWA Mode - Direct to native app */
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-bold">Use the Native App</h3>
                    <p className="text-sm mt-1">For the best experience with sign-in, please use the native Findr app from the App Store.</p>
                    <a
                      href="https://apps.apple.com/app/findr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm mt-3"
                    >
                      Download from App Store
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  {/* Google Sign-In - Browser only */}
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

                  {/* Apple Sign-In - Hidden on Android (requires complex web OAuth) */}
                  {!isAndroid && (
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
                  )}
                </>
              )}
            </div>

            {!isPWA && (
              <>
                <div className="divider text-sm text-base-content/60">Passwordless & Secure</div>

                {/* Info text */}
                <div className="text-center">
                  <p className="text-sm text-base-content/70">
                    Sign in securely with your Google or Apple account. No passwords to remember!
                  </p>
                </div>
              </>
            )}

            {/* Back to findr */}
            <div className="text-center mt-2">
              <Link href="/findr" className="btn btn-ghost btn-sm">
                ← Back to findr
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
