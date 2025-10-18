import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Redirect fishfindr.eu root to /findr (but NOT for API routes, static assets, or _next)
  // Do NOT redirect godaisy.io - it's already serving /findr as a subdomain path
  if ((hostname === 'fishfindr.eu' || hostname === 'www.fishfindr.eu') && !hostname.includes('godaisy.io')) {
    // Skip redirect for:
    // - API routes (/api/*)
    // - Next.js internals (/_next/*)
    // - Static assets (/webp/*, /images/*, /weather-icons/*, etc.)
    // - PWA files (sw.js, manifest.json, workbox files)
    // - Already on findr paths
    const isApiRoute = url.pathname.startsWith('/api/');
    const isNextInternal = url.pathname.startsWith('/_next/');
    const isFindrPath = url.pathname.startsWith('/findr');
    const isPWAFile = url.pathname === '/sw.js' || 
                      url.pathname === '/manifest.json' ||
                      url.pathname.startsWith('/workbox-') ||
                      url.pathname.match(/^\/sw\.js/);
    const isStaticAsset = url.pathname.startsWith('/webp/') || 
                          url.pathname.startsWith('/images/') || 
                          url.pathname.startsWith('/weather-icons/') ||
                          url.pathname.startsWith('/waves/') ||
                          url.pathname.startsWith('/skies/') ||
                          url.pathname.startsWith('/findr-favicon/') ||
                          url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/);
    
    if (!isApiRoute && !isNextInternal && !isFindrPath && !isPWAFile && !isStaticAsset) {
      const findrUrl = url.clone();
      findrUrl.pathname = '/findr';
      return NextResponse.redirect(findrUrl);
    }
  }
  
  // Unified auth callback routing
  // All auth callbacks (PKCE, implicit, OTP) go to /auth/callback
  // The callback handler determines the correct destination based on app parameter
  const hasCode = url.searchParams.has('code');
  const hasTokenHash = url.searchParams.has('token_hash') || url.searchParams.has('token');
  const isAuthCallback = url.pathname === '/auth/callback';
  const isLegacyFindrCallback = url.pathname === '/findr/magic-link';

  if ((hasCode || hasTokenHash) && !isAuthCallback && !isLegacyFindrCallback) {
    // Redirect to unified callback handler
    const to = url.clone();
    to.pathname = '/auth/callback';
    return NextResponse.redirect(to);
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
    return NextResponse.redirect(to);
  }
  
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };