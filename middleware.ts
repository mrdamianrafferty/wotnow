import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Check for auth callback early to avoid duplicate declarations
  const hasCode = url.searchParams.has('code');
  const hasTokenHash = url.searchParams.has('token_hash') || url.searchParams.has('token');
  const isAuthCallback = url.pathname === '/auth/callback';
  const isLegacyFindrCallback = url.pathname === '/findr/magic-link';

  // Create response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Initialize Supabase client for session management
  // Skip if env vars not available (e.g., during build)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      // Refresh session if expired - but skip during OAuth callback to avoid interfering with PKCE flow
      if (!isAuthCallback) {
        await supabase.auth.getUser();
      }
    } catch {
      // Don't let auth errors prevent domain redirects from running
    }
  }

  // Helper: check if path should skip domain-based redirects
  const isApiRoute = url.pathname.startsWith('/api/');
  const isNextInternal = url.pathname.startsWith('/_next/');
  const isAuthPath = url.pathname.startsWith('/auth/');
  const isWellKnown = url.pathname.startsWith('/.well-known/');
  const isPWAFile = url.pathname === '/sw.js' ||
                    url.pathname === '/manifest.json' ||
                    url.pathname.startsWith('/manifest-') ||
                    url.pathname.startsWith('/workbox-') ||
                    url.pathname.startsWith('/fallback-') ||
                    url.pathname.match(/^\/sw\.js/);
  const isSEOFile = url.pathname === '/robots.txt' ||
                    /*
                     * Any `/sitemap*.xml`, not two names.
                     *
                     * This listed `/sitemap.xml` and `/sitemap-0.xml`
                     * literally, so when the Grow sitemap became an index with
                     * per-language children every child — `/sitemap-fr.xml`,
                     * `/sitemap-core.xml` — missed the allowlist, fell through
                     * to the grow.godaisy.io catch-all and 307'd to /grow. The
                     * index pointed at eight redirects.
                     *
                     * A pattern rather than a list, because the next sitemap
                     * added will have the same problem and nobody will think to
                     * come back here.
                     */
                    url.pathname.match(/^\/sitemap[a-z0-9-]*\.xml$/) !== null ||
                    url.pathname === '/llms.txt' ||
                    url.pathname === '/BingSiteAuth.xml' ||
                    url.pathname.match(/^\/google[a-z0-9]+\.html$/) !== null ||
                    url.pathname.match(/^\/[a-f0-9]{32}\.txt$/) !== null;
  const isStaticAsset = url.pathname.startsWith('/webp/') ||
                        url.pathname.startsWith('/images/') ||
                        url.pathname.startsWith('/weather-icons/') ||
                        url.pathname.startsWith('/waves/') ||
                        url.pathname.startsWith('/skies/') ||
                        url.pathname.startsWith('/findr-favicon/') ||
                        url.pathname.startsWith('/grow/') ||
                        url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/);
  const shouldSkipRedirect = isApiRoute || isNextInternal || isAuthPath || isWellKnown || isPWAFile || isSEOFile || isStaticAsset;

  // Redirect grow.godaisy.io to /grow (Grow Daisy app)
  // Allow /login and /auth paths for authentication flow
  if ((hostname === 'grow.godaisy.io' || hostname === 'www.grow.godaisy.io') && !shouldSkipRedirect) {
    const isGrowPath = url.pathname.startsWith('/grow');
    const isLoginPath = url.pathname === '/login' || url.pathname.startsWith('/auth');
    if (!isGrowPath && !isLoginPath && url.pathname !== '/') {
      // Redirect non-grow, non-login paths to /grow
      const growUrl = url.clone();
      growUrl.pathname = '/grow';
      response = NextResponse.redirect(growUrl);
    } else if (url.pathname === '/') {
      // Redirect root to /grow
      const growUrl = url.clone();
      growUrl.pathname = '/grow';
      response = NextResponse.redirect(growUrl);
    }
  }

  // Redirect fishfindr.eu root to /findr (but NOT for API routes, static assets, or _next)
  // Note: fishfindr.eu is a Vercel domain on the standalone `findr` project, not
  // this one — this rule is effectively dead in production, kept for local dev.
  if ((hostname === 'fishfindr.eu' || hostname === 'www.fishfindr.eu') && !hostname.includes('godaisy.io')) {
    const isFindrPath = url.pathname.startsWith('/findr');

    if (!shouldSkipRedirect && !isFindrPath) {
      const findrUrl = url.clone();
      findrUrl.pathname = '/findr';
      response = NextResponse.redirect(findrUrl);
    }
  }

  // godaisy.io/findr/* is a fully superseded parallel copy of the findr app —
  // the real one lives at fishfindr.eu now. Permanently redirect it there,
  // preserving path + query, so the section stops being served (and
  // stops burning Google Places API calls) from here at all.
  // Active auth-callback links (magic-link emails with code/token_hash) are
  // excluded so an in-flight sign-in still completes on this domain via the
  // legacy-callback handling below, rather than being bounced mid-flow.
  if (
    (hostname === 'godaisy.io' || hostname === 'www.godaisy.io') &&
    url.pathname.startsWith('/findr') &&
    !shouldSkipRedirect &&
    !hasCode &&
    !hasTokenHash
  ) {
    const target = new URL(url.pathname + url.search, 'https://fishfindr.eu');
    response = NextResponse.redirect(target, 308);
  }
  
  // Unified auth callback routing
  // All auth callbacks (PKCE, implicit, OTP) go to /auth/callback
  // The callback handler determines the correct destination based on app parameter
  if ((hasCode || hasTokenHash) && !isAuthCallback && !isLegacyFindrCallback) {
    // Redirect to unified callback handler
    const to = url.clone();
    to.pathname = '/auth/callback';
    response = NextResponse.redirect(to);
  }

  // Support legacy /findr/magic-link callback for backwards compatibility
  // (existing email links may still point there)
  if (isLegacyFindrCallback && (hasCode || hasTokenHash)) {
    const to = url.clone();
    to.pathname = '/auth/callback';
    // Preserve app=findr parameter for routing
    if (!to.searchParams.has('app')) {
      to.searchParams.set('app', 'findr');
    }
    response = NextResponse.redirect(to);
  }

  return response;
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };