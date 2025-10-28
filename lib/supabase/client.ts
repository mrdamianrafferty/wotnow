import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth',
    },
    cookieOptions: {
      name: 'sb-auth-token',
      domain: typeof window !== 'undefined' ? window.location.hostname : undefined,
      path: '/',
      sameSite: 'lax',
    }
  }
);
