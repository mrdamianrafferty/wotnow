import { createBrowserClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

// Create browser client with proper cookie handling for SSR
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined;
        const cookie = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined;
      },
      set(name: string, value: string, options: CookieOptions) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=${encodeURIComponent(value)}; path=${options.path || '/'}; max-age=${options.maxAge || 31536000}; SameSite=${options.sameSite || 'Lax'}${options.secure ? '; Secure' : ''}`;
      },
      remove(name: string, options: CookieOptions) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; path=${options.path || '/'}; max-age=0`;
      },
    },
  }
);
