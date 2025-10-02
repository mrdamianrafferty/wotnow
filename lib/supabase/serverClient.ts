import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseOptions = Parameters<typeof createClient>[2]

const DEFAULT_SUPABASE_OPTIONS: SupabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}

let cachedSupabase: SupabaseClient | null = null

export function getSupabaseServerClient(): SupabaseClient {
  if (cachedSupabase) {
    return cachedSupabase
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required.')
  }

  const key = serviceRoleKey || anonKey

  if (!key) {
    throw new Error('Supabase credentials missing: set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.')
  }

  if (!serviceRoleKey && process.env.NODE_ENV !== 'production') {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set; falling back to anon key with limited permissions.')
  }

  cachedSupabase = createClient(url, key, DEFAULT_SUPABASE_OPTIONS)
  return cachedSupabase
}

export type { SupabaseClient }
