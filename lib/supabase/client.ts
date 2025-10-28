import { createBrowserClient } from '@supabase/ssr'

// Create browser client - SSR package handles cookies automatically
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
