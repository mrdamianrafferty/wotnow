/**
 * Apple Sign In Wrapper
 *
 * Unified Apple Sign In that works across platforms.
 * Integrates with Supabase authentication.
 *
 * Features:
 * - Native Sign in with Apple on iOS (via Capacitor)
 * - Web fallback using Supabase OAuth (redirects to Apple)
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

import { SignInWithApple, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { createLogger } from '@/lib/utils/logger';
import { mapAuthError } from './utils';

const logger = createLogger('AppleSignIn');

/**
 * Check if Apple Sign In is available on this platform
 */
export function isAppleSignInAvailable(): boolean {
  // Apple Sign In is only available on:
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
 * Uses Capacitor plugin to trigger native Apple Sign In flow
 */
async function signInWithAppleNative(supabase: SupabaseClient): Promise<void> {
  try {
    logger.info('Starting native Apple Sign In flow');

    // Trigger native Apple Sign In dialog
    const result: SignInWithAppleResponse = await SignInWithApple.authorize({
      clientId: 'eu.fishfindr.app', // Your iOS app bundle ID
      redirectURI: 'https://fishfindr.eu/auth/callback',
      scopes: 'email name',
      state: 'findr-app',
      nonce: generateNonce(), // Security: prevent replay attacks
    });

    logger.info('Apple Sign In successful', {
      user: result.response?.user,
      email: result.response?.email
    });

    // Exchange Apple identity token for Supabase session
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: result.response.nonce,
    });

    if (error) {
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: finalRedirectTo,
        queryParams: {
          // Prompt user to select account (better UX for multi-account users)
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }

    // User will be redirected to Apple's OAuth page
    // After authentication, they'll return to /auth/callback
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
    if (Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()) {
      // Native iOS flow - better UX (no browser redirect)
      await signInWithAppleNative(supabase);
    } else {
      // Web flow (redirects to Apple OAuth)
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
 * Generate a cryptographic nonce for Apple Sign In
 * Prevents replay attacks
 */
function generateNonce(): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  let result = '';
  const length = 32;

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Use Web Crypto API (secure random)
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  } else {
    // Fallback to Math.random (less secure, but better than nothing)
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }

  return result;
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
