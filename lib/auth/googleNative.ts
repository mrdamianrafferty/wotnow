import type { SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('GoogleNativeAuth');

export const GOOGLE_NATIVE_ERRORS = {
  NOT_AVAILABLE: 'GOOGLE_NATIVE_NOT_AVAILABLE',
  NOT_CONFIGURED: 'GOOGLE_NATIVE_NOT_CONFIGURED',
  CANCELLED: 'GOOGLE_NATIVE_CANCELLED',
  MISSING_ID_TOKEN: 'GOOGLE_NATIVE_MISSING_ID_TOKEN',
} as const;

let initialized = false;
let initializationPromise: Promise<void> | null = null;

function isNativeEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Capacitor.isNativePlatform();
  } catch (error) {
    logger.warn('Capacitor platform detection failed', error);
    return false;
  }
}

function getGoogleClientConfig(): { iosClientId: string; webClientId: string } {
  const iosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  if (!iosClientId || !webClientId) {
    throw new Error(GOOGLE_NATIVE_ERRORS.NOT_CONFIGURED);
  }

  return { iosClientId, webClientId };
}

function isCancellationError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'string'
    ? error
    : typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';

  return message.toLowerCase().includes('cancel');
}

async function ensureInitialized(): Promise<void> {
  if (!isNativeEnvironment()) {
    throw new Error(GOOGLE_NATIVE_ERRORS.NOT_AVAILABLE);
  }

  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { iosClientId, webClientId } = getGoogleClientConfig();
      logger.info('Initializing Google native auth plugin');
      const { SocialLogin } = await import('@capgo/capacitor-social-login');

      await SocialLogin.initialize({
        google: {
          iOSClientId: iosClientId,
          iOSServerClientId: webClientId,
          webClientId,
          mode: 'online',
        },
      });

      initialized = true;
      logger.info('Google native auth plugin ready');
    })()
      .catch((error) => {
        initialized = false;
        if (isCancellationError(error)) {
          throw new Error(GOOGLE_NATIVE_ERRORS.CANCELLED);
        }
        if (error instanceof Error && error.message === GOOGLE_NATIVE_ERRORS.NOT_CONFIGURED) {
          throw error;
        }
        logger.error('Failed to initialize Google native auth plugin', error);
        throw error;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  await initializationPromise;
}

export function isGoogleNativeAvailable(): boolean {
  if (!isNativeEnvironment()) {
    return false;
  }

  try {
    getGoogleClientConfig();
    return true;
  } catch {
    return false;
  }
}

export async function signInWithGoogleNative(supabase: SupabaseClient): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error(GOOGLE_NATIVE_ERRORS.NOT_AVAILABLE);
  }

  await ensureInitialized();

  try {
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['profile', 'email'],
        prompt: 'select_account',
        forcePrompt: true,
      },
    });

    const payload = result.result;

    if (payload.responseType !== 'online' || !payload.idToken) {
      logger.error('Google native login missing ID token', payload);
      throw new Error(GOOGLE_NATIVE_ERRORS.MISSING_ID_TOKEN);
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: payload.idToken,
    });

    if (error) {
      throw error;
    }

    logger.info('Google native sign-in completed');
  } catch (error) {
    if (isCancellationError(error)) {
      throw new Error(GOOGLE_NATIVE_ERRORS.CANCELLED);
    }

    if (error instanceof Error && error.message in GOOGLE_NATIVE_ERRORS) {
      throw error;
    }

    logger.error('Google native sign-in failed', error);
    throw error instanceof Error ? error : new Error('Google Sign In failed');
  }
}
