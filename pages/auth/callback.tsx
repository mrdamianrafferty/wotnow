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

// Structured logging helper for auth flow debugging
function logAuthStep(step: string, data?: Record<string, unknown>) {
  console.log(`[Auth Flow] ${step}`, {
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    ...data
  });
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'That link could not be used. Please start again from the login page.';
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMediaQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const navigatorStandalone = typeof navigator !== 'undefined' && 'standalone' in navigator
    ? Boolean((navigator as unknown as { standalone?: boolean }).standalone)
    : false;
  return standaloneMediaQuery || navigatorStandalone;
}

// Determine the correct destination based on context
function getDestination(params: {
  returnTo?: string | null;
  app?: string | null;
  isRecovery: boolean;
  hostname: string;
  origin?: string | null;
}): string {
  const { returnTo, app, isRecovery, hostname, origin } = params;

  // If this is a recovery flow, send to appropriate password update page
  if (isRecovery) {
    const isFindrFlow = app === 'findr' || hostname.includes('fishfindr.eu') || origin?.includes('fishfindr.eu');
    const isGrowDaisyFlow = app === 'growdaisy' || hostname.includes('grow.godaisy.io') || hostname.includes('growdaisy.io') || origin?.includes('grow.godaisy.io') || origin?.includes('growdaisy.io');
    return isFindrFlow ? '/findr/update-password' : isGrowDaisyFlow ? '/grow/reset-password' : '/auth/reset';
  }

  // If returnTo is specified and safe, use it
  if (returnTo) {
    // Validate returnTo is same-origin or same-base-domain and safe
    try {
      const url = new URL(returnTo, window.location.origin);
      const currentHostname = window.location.hostname;
      const targetHostname = url.hostname;

      // Allow same origin (exact match)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash;
      }

      // Allow same-base-domain (e.g., auth.godaisy.io → godaisy.io or grow.godaisy.io → godaisy.io or fishfindr.eu)
      const baseDomain = currentHostname.includes('godaisy') ? 'godaisy.io' :
                         currentHostname.includes('growdaisy') ? 'growdaisy.io' :
                         currentHostname.includes('fishfindr') ? 'fishfindr.eu' : null;
      if (baseDomain && targetHostname.endsWith(baseDomain)) {
        // Return full URL for cross-subdomain redirect
        return url.toString();
      }
    } catch {
      // Invalid URL, fall through to defaults
    }
  }

  // Check sessionStorage for stored origin
  const storedApp = typeof window !== 'undefined' ? sessionStorage.getItem('oauth_app') : null;
  const storedOrigin = typeof window !== 'undefined' ? sessionStorage.getItem('oauth_origin') : null;

  // Determine app context from multiple sources
  const isFindrFlow =
    app === 'findr' ||
    storedApp === 'findr' ||
    hostname.includes('fishfindr.eu') ||
    origin?.includes('fishfindr.eu') ||
    storedOrigin?.includes('fishfindr.eu');

  const isGrowDaisyFlow =
    app === 'growdaisy' ||
    storedApp === 'growdaisy' ||
    hostname.includes('grow.godaisy.io') ||
    hostname.includes('growdaisy.io') ||
    origin?.includes('grow.godaisy.io') ||
    origin?.includes('growdaisy.io') ||
    storedOrigin?.includes('grow.godaisy.io') ||
    storedOrigin?.includes('growdaisy.io') ||
    storedOrigin?.startsWith('/grow') ||
    returnTo?.startsWith('/grow');

  // For Grow Daisy native app, redirect using deep link
  // Check if user came from grow subdomain or has /grow returnTo AND is on mobile
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isGrowNativeApp = isGrowDaisyFlow && isMobile && !isStandaloneDisplayMode();

  if (isGrowNativeApp) {
    // Use deep link to return to native app
    return 'growdaisy://auth/callback';
  }

  const destination = isFindrFlow ? '/findr' : isGrowDaisyFlow ? '/grow' : '/';
  console.log('[OAuth Debug] getDestination result:', { destination, isFindrFlow, isGrowDaisyFlow, app, hostname, origin });
  return destination;
}

export default function AuthCallback() {
  const router = useRouter();
  const { query } = router;

  const [phase, setPhase] = useState<Phase>(Phase.Checking);
  const [error, setError] = useState<string | null>(null);
  const [detectedApp, setDetectedApp] = useState<'godaisy' | 'findr'>('godaisy');
  const [isExternalBrowser, setIsExternalBrowser] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    // Detect platform and decide whether to process auth
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        const hasOAuthParams = router.query.code || router.query.access_token || router.query.token_hash;

        if (isNative) {
          console.log('[Auth Callback] Native platform detected - closing in-app browser');
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
          // Let the deep link handler in the app process the auth
          return;
        }

        // Detect if this is a mobile browser (iOS Safari/Chrome on mobile)
        const isMobileBrowser = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const standaloneMode = isStandaloneDisplayMode();

        // Only show Universal Link prompt for mobile browsers with OAuth params that
        // are NOT already running in standalone/PWA mode (where we control the experience)
        if (hasOAuthParams && isMobileBrowser && !standaloneMode) {
          console.log('[Auth Callback] Mobile browser with OAuth params - showing Universal Link prompt');
          setIsExternalBrowser(true);
          setDetectedApp(window.location.hostname.includes('fishfindr.eu') ? 'findr' : 'godaisy');
          // STOP HERE - don't process auth, let Universal Link handle it
          return;
        }

        // Desktop browser or no OAuth params - fall through to normal auth processing
      } catch (e) {
        console.warn('[Auth Callback] Could not detect platform:', e);
      }
    })();

    const typeParam = query.type as string | undefined;
    const tokenHash = (query.token_hash as string) || (query.token as string);
    const oauthError = (query.error as string) || (query.error_description as string);
    const code = query.code as string | undefined;
    const access_token = query.access_token as string | undefined;
    const refresh_token = query.refresh_token as string | undefined;
    const returnTo = (query.returnTo as string) || (query.redirect_to as string);
    const app = query.app as string | undefined;
    const origin = query.origin as string | undefined;

    // Set a timeout to catch hanging auth flows
    const timeoutId = setTimeout(() => {
      console.error('Auth callback timeout - stuck for 15 seconds');
      setError('Authentication is taking too long. Please try again.');
      setPhase(Phase.Error);
    }, 15000); // 15 second timeout

    (async () => {
      try {
        // Check if we're in external browser mode - if so, don't process auth
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        const hasOAuthParams = code || access_token || tokenHash;

        // Detect if this is a mobile browser (iOS Safari/Chrome on mobile)
        const isMobileBrowser = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const standaloneMode = isStandaloneDisplayMode();

        // Only show Universal Link prompt for mobile browsers with OAuth params that are not in standalone/PWA mode
        if (!isNative && hasOAuthParams && isMobileBrowser && !standaloneMode) {
          console.log('[Auth Callback] Mobile browser mode - skipping auth processing for Universal Link');
          clearTimeout(timeoutId);
          return; // Exit early - let Universal Link handle it
        }

        // Detect which app this is for
        const isFindr =
          app === 'findr' ||
          window.location.hostname.includes('fishfindr.eu') ||
          origin?.includes('fishfindr.eu') ||
          sessionStorage.getItem('oauth_app') === 'findr';
        setDetectedApp(isFindr ? 'findr' : 'godaisy');

        // Log callback initialization
        logAuthStep('Callback initiated', {
          app: isFindr ? 'findr' : 'godaisy',
          type: typeParam,
          hasCode: !!code,
          hasTokenHash: !!tokenHash,
          hasAccessToken: !!access_token,
          hasError: !!oauthError,
        });

        // If the provider redirected with an explicit error, surface it.
        if (oauthError) {
          throw new Error(oauthError);
        }

        // Handle PKCE flow (newer Supabase magic links and OAuth)
        if (code) {
          // Debug: Check localStorage for PKCE verifier
          const storageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('pkce'));
          logAuthStep('Starting PKCE code exchange', {
            codeLength: code.length,
            hostname: window.location.hostname,
            origin: window.location.origin,
            storageKeys: storageKeys.length,
            storageKeysFound: storageKeys
          });

          // Manually exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            logAuthStep('Code exchange failed', {
              error: getErrorMessage(exchangeError),
              errorCode: exchangeError?.code,
              errorStatus: exchangeError?.status
            });

            // WORKAROUND: Sometimes the session is created even though code exchange "fails"
            // Check if a session actually exists before throwing the error
            logAuthStep('Checking if session exists despite error...');
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();

            if (fallbackSession) {
              logAuthStep('Session exists despite code exchange error! Using fallback session.', {
                userEmail: fallbackSession.user?.email
              });
              // Continue with the session we found
            } else {
              // No session found, throw the error
              throw exchangeError;
            }
          }

          if (!data?.session) {
            // Check for fallback session one more time
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
            if (!fallbackSession) {
              logAuthStep('No session created after code exchange');
              throw new Error('No session created after authentication');
            }
          }

          const session = data?.session || (await supabase.auth.getSession()).data.session;

          if (!session) {
            throw new Error('No session available after all checks');
          }

          logAuthStep('Session established by SDK', {
            userEmail: session.user?.email
          });

          setPhase(Phase.Done);

          // Check sessionStorage for stored returnTo (from shared-login flow)
          const storedReturnTo = sessionStorage.getItem('oauth_origin');

          const destination = getDestination({
            returnTo: returnTo || storedReturnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
            origin,
          });

          logAuthStep('Redirecting to destination', {
            destination,
            isFullUrl: destination.startsWith('http'),
            currentOrigin: window.location.origin
          });

          // Clear stored OAuth context
          sessionStorage.removeItem('oauth_origin');
          sessionStorage.removeItem('oauth_app');

          // Handle both relative paths and full URLs
          if (destination.startsWith('http')) {
            // Full URL - use window.location for cross-origin redirect
            console.log('[Auth Flow] Cross-origin redirect to:', destination);
            window.location.href = destination;
          } else {
            // Relative path - use router for same-origin navigation
            console.log('[Auth Flow] Same-origin redirect to:', destination);
            window.location.replace(destination);
          }
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

          // Check sessionStorage for stored returnTo (from shared-login flow)
          const storedReturnTo = sessionStorage.getItem('oauth_origin');

          const destination = getDestination({
            returnTo: returnTo || storedReturnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
            origin,
          });

          console.log('Redirecting to:', destination);
          
          // Clear stored OAuth context
          sessionStorage.removeItem('oauth_origin');
          sessionStorage.removeItem('oauth_app');
          
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

          // Check sessionStorage for stored returnTo (from shared-login flow)
          const storedReturnTo = sessionStorage.getItem('oauth_origin');

          const destination = getDestination({
            returnTo: returnTo || storedReturnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
            origin,
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

          // Check sessionStorage for stored returnTo (from shared-login flow)
          const storedReturnTo = sessionStorage.getItem('oauth_origin');

          const destination = getDestination({
            returnTo: returnTo || storedReturnTo,
            app,
            isRecovery: (typeParam || '').toLowerCase() === 'recovery',
            hostname: window.location.hostname,
            origin,
          });

          console.log('Redirecting to:', destination);
          router.replace(destination);
          return;
        }

        // If we get here, parameters are missing or the session isn't ready
        throw new Error('Missing or invalid parameters.');
      } catch (e: unknown) {
        logAuthStep('Auth callback error', {
          error: getErrorMessage(e),
          errorType: typeof e,
          errorName: (e as Error)?.name
        });
        setError(getErrorMessage(e));
        setPhase(Phase.Error);
      } finally {
        // Clear the timeout
        clearTimeout(timeoutId);
      }
    })();
  }, [router.isReady, router, query]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      {isExternalBrowser ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <svg className="w-20 h-20 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <h1 className="text-2xl font-semibold text-center">Continue in the {detectedApp === 'findr' ? 'Findr' : 'Go Daisy'} app</h1>
            <p className="text-center text-base-content/70">
              Tap <span className="font-semibold text-primary">&quot;OPEN&quot;</span> at the top of this page to complete sign-in
            </p>
            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Look for the banner at the top of this page</span>
            </div>
          </div>
        </>
      ) : (
        <>
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
            <Link 
              href={detectedApp === 'findr' ? '/findr/auth' : '/login'} 
              className="btn btn-primary btn-sm"
            >
              Try Again
            </Link>
            <Link 
              href={detectedApp === 'findr' ? '/findr' : '/'} 
              className="btn btn-ghost btn-sm"
            >
              {detectedApp === 'findr' ? 'Go to Findr' : 'Go to Home'}
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
        </>
      )}
    </main>
  );
}
