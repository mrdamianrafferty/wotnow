/**
 * The home screen — phase 7.
 *
 * `/call` is `/` now. What used to live here was `HomeApp`: 1,300 lines of day
 * cards, hero activities, quick-setup modals and warning strips, reached
 * through five separate navigation systems. It is not archived in a folder —
 * it is in git, one `git show` from this commit's parent away, and keeping a
 * dead copy in the tree is how a migration stays half-done for a year.
 *
 * WHAT IS NOT SWAPPED, AND WHY. Unauthenticated web visitors and Googlebot
 * still get `LandingPage`. That page is the indexed homepage and carries the
 * marketing copy; replacing it with a personal forecast is a decision about
 * search and conversion, not a side effect of finishing a migration — and the
 * redesign has no marketing landing built to replace it with yet. The door to
 * the new experience sits on it, so a stranger is one tap away.
 *
 * The auth-code redirect and the landing decision below are unchanged, down to
 * the CDN header: `/` varies by auth state and Vercel keys it by path alone, so
 * an anonymous visitor could otherwise warm the cache with the landing page and
 * serve it to everyone signed in.
 *
 * @module pages/index
 */

import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import LandingPage from '../components/LandingPage';
import CallPage, {
  getServerSideProps as callServerSideProps,
  type CallPageProps,
} from './call';

type HomeProps =
  | { showLanding: true }
  | { showLanding: false; call: CallPageProps };

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { query, req, res } = ctx;
  const code = typeof query.code === 'string' ? query.code : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;

  // If Supabase dropped us on the homepage with an auth code or a recovery hint,
  // forward to the dedicated callback page to complete the flow.
  if (code || type === 'recovery') {
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (type) params.set('type', type);
    return {
      redirect: {
        destination: `/auth/callback${params.toString() ? `?${params.toString()}` : ''}`,
        permanent: false,
      },
    };
  }

  // ----- Landing page decision -----
  // Show the public marketing landing page when ALL of these are true:
  //   1. the visitor is NOT inside the Capacitor (native iOS/Android) shell
  //   2. the visitor is NOT logged in (no Supabase session cookie)
  //
  // If Capacitor's user-agent uses a different identifier in production,
  // add it to the regex below.
  const userAgent = (req.headers['user-agent'] || '').toString();
  const isCapacitor = /Capacitor|wotnow-app|godaisy-app/i.test(userAgent);

  // Supabase auth session cookies are named `sb-<project-ref>-auth-token`.
  // Large sessions (e.g. OAuth, which carry provider/id tokens) get chunked by
  // @supabase/ssr into `sb-<ref>-auth-token.0`, `.1`, … with no unsuffixed base
  // cookie, so the suffix must be optional or OAuth logins are missed and the
  // user is wrongly shown the marketing landing page. Presence check is good
  // enough for the SSR landing-vs-app decision; actual auth validation still
  // happens client-side in the app code.
  const cookieHeader = (req.headers.cookie || '').toString();
  const hasSupabaseSession = /sb-[^=]+-auth-token(\.\d+)?=/i.test(cookieHeader);

  const showLanding = !isCapacitor && !hasSupabaseSession;

  // The homepage varies by auth state (marketing landing for anonymous visitors,
  // the app for signed-in / native users), but Vercel's CDN keys `/` by path
  // only — NOT by cookie or user-agent. A `public, s-maxage` response would be
  // shared across auth states, so an anonymous visitor warms the cache with the
  // landing page and logged-in users then get served that cached landing instead
  // of the app. Keep `/` per-request so the SSR decision above is authoritative.
  // (If anonymous-traffic CDN caching becomes important, move this decision into
  // middleware and rewrite authed/native requests to a separate, uncached path.)
  res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');

  if (showLanding) {
    return { props: { showLanding: true as const } };
  }

  /*
   * THE SWAP. Everyone who is not being shown the marketing page gets the
   * call — signed-in visitors and anyone inside the native shell.
   *
   * Delegated to `/call`'s own loader rather than reimplemented: they answer
   * the same question about the same person, and two loaders would drift the
   * day one of them learned something the other did not.
   */
  const result = await callServerSideProps(ctx);
  if (!('props' in result)) return result;
  return { props: { showLanding: false as const, call: await result.props } };
};

export default function HomePage(props: HomeProps) {
  if (props.showLanding) return <LandingPage />;
  return <CallPage {...props.call} />;
}
