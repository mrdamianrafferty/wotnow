import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Creates a Supabase client for use in Next.js Pages API routes
 *
 * @deprecated Use createPagesServerClient from @supabase/auth-helpers-nextjs instead
 * This function is maintained for backwards compatibility but should be migrated
 */
export function createServerSupabaseClient(context: { req: NextApiRequest; res: NextApiResponse }) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => context.req.cookies[name],
        set: (name: string, value: string, options: CookieOptions) => {
          context.res.setHeader('Set-Cookie', [
            `${name}=${value}; Path=${options.path || '/'}; HttpOnly=${options.httpOnly !== false}; SameSite=${options.sameSite || 'lax'}; Secure=${options.secure !== false}${options.maxAge ? `; Max-Age=${options.maxAge}` : ''}${options.domain ? `; Domain=${options.domain}` : ''}`
          ])
        },
        remove: (name: string, options: CookieOptions) => {
          context.res.setHeader('Set-Cookie', [
            `${name}=; Path=${options.path || '/'}; HttpOnly=${options.httpOnly !== false}; SameSite=${options.sameSite || 'lax'}; Secure=${options.secure !== false}; Max-Age=0${options.domain ? `; Domain=${options.domain}` : ''}`
          ])
        },
      },
    }
  )
}

/**
 * Recommended: Creates a Supabase client for Pages API routes using official helper
 */
export function createPagesServerClient(context: { req: NextApiRequest; res: NextApiResponse }) {
  return createServerSupabaseClient(context);
}