/**
 * Shared authentication utilities for consistent behavior across Go Daisy and Findr
 */

/**
 * Normalize email address for consistent authentication
 * - Trims whitespace
 * - Converts to lowercase
 * - Prevents case-sensitivity issues
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Get error message from unknown error object
 */
function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Map Supabase auth errors to user-friendly messages
 * Provides consistent, helpful error messages across all auth pages
 */
export function mapAuthError(err: unknown): string {
  const msg = getErrorMessage(err).toLowerCase();

  // Invalid credentials
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Invalid email or password. If you signed up with Google or Apple, use that option to sign in.';
  }

  // Rate limiting
  if (msg.includes('email rate limit') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  // PKCE / code verifier issues (browser/tab switching problems)
  if (msg.includes('pkce') || msg.includes('code verifier')) {
    return 'We had trouble completing sign-in in this browser. Please try again or use the magic link option.';
  }

  // Email not confirmed
  if (msg.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  // User already registered
  if (msg.includes('user already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Network/connection issues
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Return original message if no specific mapping
  return getErrorMessage(err);
}

/**
 * Validate session and clear if corrupted
 * Returns true if session is valid, false if it was cleared
 */
export async function validateAndCleanSession(
  supabase: { auth: { getSession: () => Promise<{ data: { session: unknown }; error: unknown }>; signOut: () => Promise<{ error: unknown }> } }
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      // Session is corrupted, clear it
      console.warn('[Auth] Corrupted session detected, clearing:', error);
      await supabase.auth.signOut();
      return false;
    }

    return !!data.session;
  } catch (err) {
    console.error('[Auth] Session validation failed:', err);
    // If validation fails, try to clear session
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signout errors
    }
    return false;
  }
}
