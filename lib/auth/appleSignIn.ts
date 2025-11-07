/**
 * Apple Sign In Wrapper
 *
 * Unified Apple Sign In that works across platforms using ASWebAuthenticationSession.
 * Integrates with Supabase authentication.
 *
 * Features:
 * - Native Sign in with Apple on iOS (via @capgo/capacitor-social-login)
 * - Web fallback using Supabase OAuth
 * - Uses ASWebAuthenticationSession (correct iOS OAuth API)
 * - No external browser redirects
 * - Automatic user profile creation
 * - Error handling and user-friendly messages
 * - iOS App Store compliance
 *
 * Usage:
 *   import { signInWithApple } from '@/lib/auth/appleSignIn';
 *
 *   try {
 *     await signInWithApple(supabaseClient);
 *     // User is now signed in
 *   } catch (error) {
 *     console.error(error);
 *   }
 *
 * Requirements:
 * - Supabase project must have Apple OAuth configured
 * - iOS app must have "Sign in with Apple" capability enabled
 * - Apple Developer account with Services ID configured
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { createLogger } from '@/lib/utils/logger';
import { mapAuthError } from './utils';

const logger = createLogger('AppleSignIn');

/**
 * Check if Apple Sign In is available on this platform
 */
export function isAppleSignInAvailable(): boolean {
  // Apple Sign In is available on:
  // 1. Native iOS apps
  // 2. Web browsers (via Supabase OAuth redirect)
  if (typeof window === 'undefined') {
    return false; // SSR
  }

  // Native iOS: Always available (required by App Store)
  if (Capacitor.getPlatform() === 'ios') {
    return true;
  }

  // Web: Available on all browsers (Supabase handles OAuth redirect)
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  // Android: Not available (Apple doesn't support it)
  return false;
}

/**
 * Sign in with Apple on native iOS
 * Uses @capgo/capacitor-social-login with ASWebAuthenticationSession
 */
async function signInWithAppleNative(supabase: SupabaseClient): Promise<void> {
  try {
    logger.info('Starting native Apple Sign In flow with @capgo/capacitor-social-login');

    // Import the plugin dynamically
    const { SocialLogin } = await import('@capgo/capacitor-social-login');

    // Initialize the plugin for Apple
    // CRITICAL: For native iOS, we MUST use the app bundle ID
    // Services ID (io.godaisy.login) is ONLY for web-based OAuth
    // Native iOS Sign in with Apple uses the app's bundle identifier
    // Supabase must be configured to accept BOTH identifiers (see docs/APPLE_AUTH_FINAL_FIX.md)
    await SocialLogin.initialize({
      apple: {
        clientId: 'eu.fishfindr.app', // Bundle ID for native iOS (Findr app)
      },
    });

    logger.info('Plugin initialized, requesting Apple login');

    // CRITICAL: Generate a nonce for security
    // This nonce must be passed to both Apple AND Supabase
    // Reference: https://supabase.com/docs/guides/auth/social-login/auth-apple
    const rawNonce = crypto.randomUUID();
    logger.info('Generated nonce for Apple Sign In', { nonceLength: rawNonce.length });

    // Login with Apple (uses ASWebAuthenticationSession on iOS)
    const result = await SocialLogin.login({
      provider: 'apple',
      options: {
        scopes: ['email', 'name'],
        nonce: rawNonce,  // ⭐ Pass nonce to Apple
      },
    });

    logger.info('Apple Sign In successful', {
      hasIdToken: !!result.result.idToken,
      hasAccessToken: !!result.result.accessToken,
      email: result.result.profile?.email
    });

    // Exchange Apple identity token for Supabase session
    if (!result.result.idToken) {
      throw new Error('No identity token returned from Apple Sign In');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.result.idToken,
      nonce: rawNonce,  // ⭐ Pass THE SAME nonce to Supabase
    });

    if (error) {
      logger.error('Supabase signInWithIdToken failed', {
        error,
        hasToken: !!result.result.idToken,
      });
      throw error;
    }

    logger.info('Supabase session created successfully');
  } catch (error: unknown) {
    logger.error('Native Apple Sign In failed', error);

    // Check if user cancelled
    if (isUserCancellation(error)) {
      throw new Error('Sign in cancelled');
    }

    throw error;
  }
}

/**
 * Sign in with Apple on web
 * Uses Supabase OAuth redirect flow
 */
async function signInWithAppleWeb(
  supabase: SupabaseClient,
  redirectTo?: string
): Promise<void> {
  try {
    logger.info('Starting web Apple Sign In flow');

    const finalRedirectTo = redirectTo || `${window.location.origin}/auth/callback`;

    logger.info('OAuth redirect URL:', finalRedirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: finalRedirectTo,
        queryParams: {
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    // User will be redirected to Apple's OAuth page
    logger.info('Redirecting to Apple OAuth');
  } catch (error) {
    logger.error('Web Apple Sign In failed', error);
    throw error;
  }
}

/**
 * Sign in with Apple (unified across platforms)
 *
 * @param supabase - Supabase client instance
 * @param redirectTo - Optional redirect URL after authentication (default: current origin + /auth/callback)
 * @throws Error with user-friendly message
 */
export async function signInWithApple(
  supabase: SupabaseClient,
  redirectTo?: string
): Promise<void> {
  if (!isAppleSignInAvailable()) {
    throw new Error('Apple Sign In is not available on this platform');
  }

  try {
    // On native iOS, use the native plugin with ASWebAuthenticationSession
    if (Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()) {
      logger.info('Using native Apple Sign In flow');
      await signInWithAppleNative(supabase);
    } else {
      // On web, use standard OAuth flow
      logger.info('Using web OAuth flow for Apple Sign In');
      await signInWithAppleWeb(supabase, redirectTo);
    }
  } catch (error: unknown) {
    // Special handling for user cancellation (don't show error)
    if (isUserCancellation(error)) {
      logger.info('User cancelled Apple Sign In');
      return; // Silently return, no error needed
    }

    // Map to user-friendly error message
    const friendlyError = mapAuthError(error);
    throw new Error(friendlyError);
  }
}

/**
 * Check if error is from user cancelling the sign in
 */
function isUserCancellation(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error ? String(error.message).toLowerCase() : '';
    const code = 'code' in error ? String(error.code).toLowerCase() : '';

    return (
      message.includes('cancel') ||
      message.includes('user cancel') ||
      code.includes('cancel') ||
      code === '1001' // Apple Sign In cancellation code
    );
  }
  return false;
}
