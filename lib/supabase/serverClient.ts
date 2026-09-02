import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseOptions = Parameters<typeof createClient>[2]

const DEFAULT_SUPABASE_OPTIONS: SupabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}

/**
 * Is this environment configured to reach Supabase at all?
 *
 * Callers that must tolerate an unconfigured environment — a build running
 * where no Supabase secrets exist, such as CI — can ask FIRST and take a
 * degraded path, instead of wrapping getSupabaseServerClient() in a catch.
 * That distinction matters: a catch around the client would also swallow a
 * renamed table, a network failure or a genuine bug, and silently ship
 * degraded output. This answers only "is it configured", so every other
 * failure stays loud.
 *
 * Deliberately reads the same variables as getSupabaseServerClient() below,
 * and lives beside it so the two cannot drift apart.
 */
export function hasSupabaseServerCredentials(): boolean {
  // Only the KEY, deliberately — not the URL. A missing key is what an
  // environment with no Supabase secrets looks like (CI), and is tolerable.
  // A missing SUPABASE_URL while a key is present is not that: it is broken
  // configuration, and getSupabaseServerClient() should still throw on it so
  // the build fails loudly. serverClient draws the same line in its own two
  // error messages — "credentials missing" vs "SUPABASE_URL is required".
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
}

// PERFORMANCE FIX: No caching - create fresh client per request
// This prevents auth state pollution between different users/requests
// In serverless environments, each function invocation is isolated anyway
export function getSupabaseServerClient(): SupabaseClient {
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

  // Always create a fresh client - no caching to prevent auth pollution
  return createClient(url, key, DEFAULT_SUPABASE_OPTIONS)
}

export type { SupabaseClient }
