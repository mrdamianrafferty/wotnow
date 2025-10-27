import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';
import { mapAuthError } from '../../lib/auth/utils';
import Head from 'next/head';
import { Fish, Sun, Cloud, Waves } from 'lucide-react';

/**
 * Shared login page hosted on auth.godaisy.io
 * Handles OAuth authentication for both Go Daisy and Findr
 *
 * Flow:
 * 1. User redirected here from app with returnTo and app query params
 * 2. User clicks OAuth button (Google/Apple)
 * 3. OAuth redirects to Supabase with callback to auth.godaisy.io/auth/shared-callback
 * 4. After successful auth, user redirected back to originating app with session tokens
 */
export default function SharedLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get return destination from query params
  const returnTo = router.query.returnTo as string | undefined;
  const app = router.query.app as string | undefined;

  const isFindr = app === 'findr';

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      // Store return destination in sessionStorage for callback page
      if (returnTo) {
        sessionStorage.setItem('auth_return_to', returnTo);
        console.log('[Shared Auth] Stored returnTo:', returnTo);
      }
      if (app) {
        sessionStorage.setItem('auth_app', app);
        console.log('[Shared Auth] Stored app:', app);
      }

      // OAuth callback will be handled by auth.godaisy.io (matches Supabase Site URL - no CORS)
      const redirectTo = 'https://auth.godaisy.io/auth/shared-callback';

      console.log('[Shared Auth] Starting OAuth flow:', {
        provider,
        redirectTo,
        returnTo,
        app,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            // Force account picker for Google (consistent UX)
            ...(provider === 'google' ? { prompt: 'select_account' } : {}),
          },
        },
      });

      console.log('[Shared Auth] OAuth response:', { data, error });

      if (error) {
        console.error('[Shared Auth] OAuth error:', error);
        throw error;
      }

      console.log('[Shared Auth] OAuth redirect URL:', data?.url);

      // Manually redirect to OAuth provider URL
      if (data?.url) {
        console.log('[Shared Auth] Redirecting to OAuth provider...');
        console.log('[Shared Auth] Full redirect URL:', data.url);
        // Use multiple redirect methods to ensure it works
        try {
          window.location.assign(data.url);
        } catch (e) {
          console.error('[Shared Auth] location.assign failed:', e);
          window.location.href = data.url;
        }
        return;
      }

      // If no URL returned, something went wrong
      throw new Error('No OAuth URL returned from Supabase')
    } catch (err) {
      console.error('[Shared Auth] OAuth catch block:', err);
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - {isFindr ? 'Findr' : 'Go Daisy'}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            {/* Header with app-specific branding */}
            <div className="text-center mb-6">
              <div className="flex justify-center gap-2 mb-4">
                {isFindr ? (
                  <Fish className="w-16 h-16 text-primary" />
                ) : (
                  <>
                    <Sun className="w-12 h-12 text-yellow-500" />
                    <Cloud className="w-12 h-12 text-blue-400" />
                    <Waves className="w-12 h-12 text-cyan-500" />
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold text-primary">
                {isFindr ? 'findr' : 'Go Daisy'}
              </h1>
              <p className="text-base-content/70 mt-2">
                Sign in to access your {isFindr ? 'fishing predictions' : 'outdoor activities'}
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
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="btn btn-outline btn-block gap-2 disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
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
                className="btn btn-outline btn-block gap-2 disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="divider text-sm text-base-content/60">Passwordless & Secure</div>

            {/* Info text */}
            <div className="text-center">
              <p className="text-sm text-base-content/70">
                Sign in securely with your Google or Apple account. No passwords to remember!
              </p>
            </div>

            {/* Note about shared auth */}
            <div className="text-center mt-4">
              <p className="text-xs text-base-content/50">
                Powered by secure shared authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Disable static generation - needs query params
export async function getServerSideProps() {
  return { props: {} };
}
