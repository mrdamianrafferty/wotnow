/**
 * The auth cookies a Pages API route writes back.
 *
 * `lib/supabase/pages-api.ts` built these by hand as `HttpOnly=${...}`, which
 * sets HttpOnly whatever the value — so a token refreshed by
 * `/api/user/location` became invisible to the browser client, and the app went
 * on looking signed in on the server while every client-side call behaved as
 * signed out.
 */

import { toSetCookieHeaders } from '@/lib/supabase/pages-api';
import { DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr';

describe('toSetCookieHeaders', () => {
  it('leaves an auth cookie readable by the browser client', () => {
    const [header] = toSetCookieHeaders([
      { name: 'sb-ref-auth-token', value: 'base64-abc', options: DEFAULT_COOKIE_OPTIONS },
    ]);
    expect(header).toMatch(/^sb-ref-auth-token=base64-abc;/);
    expect(header).not.toMatch(/HttpOnly/i);
  });

  it('sets HttpOnly only when it is asked for', () => {
    const [header] = toSetCookieHeaders([
      { name: 'private', value: 'x', options: { httpOnly: true, path: '/' } },
    ]);
    expect(header).toMatch(/; HttpOnly/);
  });

  it('keeps Max-Age=0, which is how a cookie is deleted', () => {
    const [header] = toSetCookieHeaders([
      { name: 'sb-ref-auth-token.1', value: '', options: { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 } },
    ]);
    expect(header).toMatch(/Max-Age=0/);
  });
});
