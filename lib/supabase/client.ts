import { createBrowserClient } from '@supabase/ssr'

// Check if we're in a native Capacitor environment
// Note: This check works at module load time
const isNative = typeof window !== 'undefined' &&
  window.hasOwnProperty('Capacitor') &&
  (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

// Lazy-load secure storage adapter to avoid circular dependencies
let storageAdapter: Storage | null = null;

function getStorageAdapter(): Storage {
  if (storageAdapter) return storageAdapter;

  if (isNative) {
    // Use secure storage for native platforms
    // This is loaded dynamically to avoid bundling Capacitor in web builds
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabaseStorageAdapter } = require('@/lib/capacitor/secureStorage');
      storageAdapter = supabaseStorageAdapter as Storage;
    } catch {
      // Fallback to localStorage if secure storage not available
      console.warn('[Supabase] Secure storage not available, using localStorage');
      storageAdapter = localStorage;
    }
  } else {
    storageAdapter = localStorage;
  }

  return storageAdapter;
}

// Official Supabase pattern for Next.js browser client
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use secure storage on native platforms for better token security
      ...(isNative && {
        auth: {
          storage: getStorageAdapter(),
          storageKey: 'sb-auth-token',
          flowType: 'pkce',
        },
      }),
    }
  )
}

// Export singleton instance for convenience
export const supabase = createClient()
