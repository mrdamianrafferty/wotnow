import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { mapAuthError } from '../../lib/auth/utils';
import Link from 'next/link';
import Head from 'next/head';
import { Fish } from 'lucide-react';
import { signInWithApple } from '../../lib/auth/appleSignIn';

export default function FindrAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNativePlatform, setIsNativePlatform] = useState(false);

  // Detect if we're on a native platform
  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setIsNativePlatform(Capacitor.isNativePlatform());
        console.log('[Findr Auth] Platform detection:', {
          isNative: Capacitor.isNativePlatform(),
          platform: Capacitor.getPlatform()
        });
      } catch (_e) {
        console.log('[Findr Auth] Not on native platform');
      }
    })();
  }, []);

  // Listen for deep link callbacks from Google OAuth
  useEffect(() => {
    if (!isNativePlatform) return;

    const setupDeepLinkListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const { Preferences } = await import('@capacitor/preferences');
        const { Browser } = await import('@capacitor/browser');

        console.log('[Findr Auth] Setting up deep link listener');

        const listener = await App.addListener('appUrlOpen', async (data: { url: string }) => {
          console.log('[Findr Auth] Deep link received:', data.url);

          // Check if this is a Google OAuth callback
          if (data.url.startsWith('fishfindr://auth/callback')) {
            try {
              // Close the browser
              await Browser.close();

              setLoading(true);
              setError(null);

              // Parse the URL to get the authorization code
              const url = new URL(data.url);
              const code = url.searchParams.get('code');

              if (!code) {
                throw new Error('No authorization code in callback URL');
              }

              console.log('[Findr Auth] Got authorization code from deep link');

              // Retrieve the code verifier from Preferences
              const { value: codeVerifier } = await Preferences.get({ key: 'google_oauth_code_verifier' });

              if (!codeVerifier) {
                throw new Error('Code verifier not found - PKCE flow failed');
              }

              console.log('[Findr Auth] Retrieved code verifier from Preferences');

              // Exchange code for tokens via our API endpoint
              const clientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
              const response = await fetch('/api/auth/google-token-exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  code,
                  codeVerifier,
                  clientId,
                  redirectUri: 'fishfindr://auth/callback',
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Token exchange failed');
              }

              const { idToken } = await response.json();

              console.log('[Findr Auth] Got ID token, creating Supabase session');

              // Exchange Google ID token for Supabase session
              const { error: supabaseError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
              });

              if (supabaseError) {
                throw supabaseError;
              }

              // Clean up the stored code verifier
              await Preferences.remove({ key: 'google_oauth_code_verifier' });

              console.log('[Findr Auth] Google Sign In successful, redirecting to /findr');
              window.location.href = '/findr';
            } catch (err) {
              console.error('[Findr Auth] Deep link callback error:', err);
              setError(err instanceof Error ? err.message : 'Google Sign In failed');
              setLoading(false);
            }
          }
        });

        // Clean up listener on unmount
        return () => {
          listener.remove();
        };
      } catch (err) {
        console.error('[Findr Auth] Failed to set up deep link listener:', err);
      }
    };

    setupDeepLinkListener();
  }, [isNativePlatform]);

  const handleNativeGoogleSignIn = async () => {
    try {
      console.log('[Findr Auth] Starting native Google Sign In with custom URL scheme');

      // Use Capacitor Browser to open Google OAuth with deep link redirect
      const { Browser } = await import('@capacitor/browser');
      const { Preferences } = await import('@capacitor/preferences');

      // Generate PKCE code verifier and challenge
      const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const generateCodeChallenge = async (verifier: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return btoa(String.fromCharCode(...hashArray))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier in Capacitor Preferences (persists across browser contexts)
      await Preferences.set({
        key: 'google_oauth_code_verifier',
        value: codeVerifier,
      });

      console.log('[Findr Auth] PKCE code verifier stored in Preferences');

      // Build Google OAuth URL with our deep link redirect
      const redirectUri = 'fishfindr://auth/callback';
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      console.log('[Findr Auth] Opening Google OAuth in browser with redirect:', redirectUri);

      // Open in browser - will redirect back to app via deep link
      await Browser.open({
        url: authUrl.toString(),
        presentationStyle: 'popover',
      });

      console.log('[Findr Auth] Browser opened, waiting for deep link callback...');

      // Note: The actual token exchange will happen in a deep link handler
      // We need to set up an App URL listener to catch the callback
    } catch (error) {
      console.error('[Findr Auth] Native Google Sign In failed:', error);
      throw error;
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      // On native platforms, use native sign in
      if (isNativePlatform) {
        console.log('[Findr Auth] Using native sign in for', provider);

        if (provider === 'apple') {
          await signInWithApple(supabase);
          console.log('[Findr Auth] Apple Sign In complete, redirecting to /findr');
          window.location.href = '/findr';
          return;
        } else if (provider === 'google') {
          try {
            await handleNativeGoogleSignIn();
            return;
          } catch (googleError: unknown) {
            // If Google native sign-in fails (e.g., not configured), fall through to web OAuth
            const errorMessage = (googleError as Error)?.message;
            if (errorMessage === 'GOOGLE_NOT_CONFIGURED') {
              console.log('[Findr Auth] Falling back to web OAuth for Google');
              // Continue to web flow below
            } else {
              throw googleError;
            }
          }
        }
      }

      // Web platform: use standard OAuth flow
      console.log('[Findr Auth] Using web OAuth for', provider);

      // Store destination for callback page
      sessionStorage.setItem('oauth_origin', '/findr');
      sessionStorage.setItem('oauth_app', 'findr');

      // Start OAuth directly from current domain (no cross-domain redirect)
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('[Findr Auth] Starting OAuth:', {
        provider,
        origin: window.location.origin,
        redirectTo: redirectUrl
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

      console.log('[Findr Auth] OAuth response:', { url: data.url, provider: data.provider });

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

            <div className="divider text-sm text-base-content/60">Passwordless & Secure</div>

            {/* Info text */}
            <div className="text-center">
              <p className="text-sm text-base-content/70">
                Sign in securely with your Google or Apple account. No passwords to remember!
              </p>
            </div>

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
