import { createBrowserClient } from '@supabase/ssr'

// Helper to get cookie value by name
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return undefined
}

// Helper to set cookie
function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`
  console.log('[Supabase Client] Set cookie:', name, '(length:', value.length, ')')
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

// Create browser client with explicit cookie handlers for PKCE
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return getCookie(name)
      },
      set(name: string, value: string, options: { maxAge?: number }) {
        setCookie(name, value, options.maxAge ? options.maxAge / 86400 : 365)
      },
      remove(name: string, _options: { maxAge?: number }) {
        deleteCookie(name)
      },
    },
  }
);
