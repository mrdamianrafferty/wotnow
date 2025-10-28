import { createBrowserClient } from '@supabase/ssr'

// Official Supabase pattern for Next.js browser client
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export singleton instance for convenience
export const supabase = createClient()
