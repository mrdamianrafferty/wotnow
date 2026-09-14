import { createServerClient, serializeCookieHeader, type CookieOptions } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * `Set-Cookie` values for the cookies Supabase asks us to write.
 *
 * This was hand-built as `HttpOnly=${opts.httpOnly !== false}`, and a cookie
 * attribute's value is ignored — `HttpOnly=false` still sets HttpOnly. So every
 * token this route refreshed came back unreadable to `document.cookie`, and the
 * browser client, which finds its session there, lost it: pages rendered on
 * the server still saw a signed-in user, while every client-side call that
 * needs a session (the call-setup mirror among them) quietly did nothing.
 * `@supabase/ssr` asks for `httpOnly: false` precisely so its browser client can
 * read these. It also dropped `Max-Age=0`, so a sign-out never deleted anything.
 *
 * The library's own serializer gets both right.
 */
export function toSetCookieHeaders(
  cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
): string[] {
  return cookiesToSet.map(({ name, value, options }) => serializeCookieHeader(name, value, options ?? {}))
}

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
        getAll: () => {
          // Convert req.cookies object to array format expected by @supabase/ssr
          return Object.keys(context.req.cookies).map(name => ({
            name,
            value: context.req.cookies[name] || ''
          }));
        },
        setAll: (cookiesToSet) => {
          const cookieStrings = toSetCookieHeaders(cookiesToSet);
          const existing = context.res.getHeader('Set-Cookie') || [];
          const existingArray = Array.isArray(existing) ? existing : [existing.toString()];
          context.res.setHeader('Set-Cookie', [...existingArray, ...cookieStrings]);
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