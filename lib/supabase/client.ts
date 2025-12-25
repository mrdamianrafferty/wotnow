import { createBrowserClient } from '@supabase/ssr'

// Check if we're in a native Capacitor environment
// Multiple detection methods for robustness when loading from remote URL
function detectNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;

  // Method 1: Direct Capacitor check (most reliable)
  const win = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    }
  };
  if (win.Capacitor?.isNativePlatform?.()) return true;

  // Method 2: Check platform (works even if isNativePlatform not available yet)
  const platform = win.Capacitor?.getPlatform?.();
  if (platform === 'ios' || platform === 'android') return true;

  // Method 3: Check user agent for native WebView indicators
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('capacitor') || ua.includes('ionic')) return true;

  // Method 4: Check for native bridge markers in iOS/Android WebViews
  if ('webkit' in window && 'messageHandlers' in (window as { webkit?: { messageHandlers?: unknown } }).webkit!) return true;

  return false;
}

const isNative = detectNativePlatform();

// Log native detection result for debugging
if (typeof window !== 'undefined') {
  const win = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  console.log('[Supabase] Native platform detected:', isNative, {
    hasCapacitor: 'Capacitor' in window,
    platform: win.Capacitor?.getPlatform?.() ?? 'unknown',
    userAgent: navigator.userAgent.substring(0, 100),
  });
}

// Official Supabase pattern for Next.js browser client
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
export function createClient() {
  // Use localStorage for all platforms - WebView localStorage persists fine
  // and avoids storage key mismatches between secure storage and localStorage
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export singleton instance for convenience
export const supabase = createClient()
