import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { mapAuthError } from '../../lib/auth/utils';
import Head from 'next/head';
import { Fish, Sun, Cloud, Waves } from 'lucide-react';

/**
 * Shared login page hosted on auth.godaisy.io
 * Handles OAuth authentication for both Go Daisy and Findr
 *
 * Flow:
 * 1. User redirected here from app with returnTo, app, and optionally provider query params
 * 2. If provider is specified, immediately start OAuth flow
 * 3. Otherwise, user clicks OAuth button (Google/Apple)
 * 4. OAuth redirects to Supabase with callback to auth.godaisy.io/auth/shared-callback
 * 5. After successful auth, user redirected back to originating app with session tokens
 */
export default function SharedLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get params from query
  const returnTo = router.query.returnTo as string | undefined;
  const app = router.query.app as string | undefined;
  const provider = router.query.provider as 'google' | 'apple' | undefined;

  const isFindr = app === 'findr';

  // Auto-start OAuth if provider is specified in URL
  useEffect(() => {
    if (provider && !loading && !error) {
      console.log('[Shared Auth] Auto-starting OAuth for provider:', provider);
      handleSocialLogin(provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]); // Only run when provider changes (intentionally excluding loading, error, handleSocialLogin)

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      // Store return destination in sessionStorage for callback page
      if (returnTo) {
        sessionStorage.setItem('auth_return_to', returnTo);
      }
      if (app) {
        sessionStorage.setItem('auth_app', app);
      }

      console.log('[Shared Auth] Starting OAuth with Supabase SDK...');

      // Use Supabase SDK for OAuth - it handles PKCE automatically
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://auth.godaisy.io/auth/shared-callback',
          queryParams: provider === 'google' ? {
            prompt: 'select_account',
          } : undefined,
        },
      });

      if (authError) {
        throw authError;
      }

      console.log('[Shared Auth] OAuth initiated successfully:', data);

      // SDK will automatically redirect to OAuth provider
    } catch (err) {
      console.error('[Shared Auth] OAuth error:', err);
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

            {/* Social Login Buttons - only show if not auto-starting OAuth */}
            {!loading && (
              <div className="space-y-3">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="btn btn-outline btn-block gap-2 text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-400 bg-white"
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
                  className="btn btn-outline btn-block gap-2 text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-400 bg-white"
                >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
              </div>
            )}

            {/* Loading State - show when OAuth is starting */}
            {loading && (
              <div className="text-center py-8">
                <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
                <p className="text-base-content/70">Starting authentication...</p>
              </div>
            )}

            {!loading && <div className="divider text-sm text-base-content/60">Passwordless & Secure</div>}

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
