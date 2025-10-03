import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

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