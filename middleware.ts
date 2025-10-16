import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Redirect fishfindr.eu to /findr (but NOT for API routes, static assets, or _next)
  if (hostname === 'fishfindr.eu' || hostname === 'www.fishfindr.eu') {
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
  
  const hasCode = url.searchParams.has('code');
  const hasTokenHash = url.searchParams.has('token_hash') || url.searchParams.has('token');
  
  // Only redirect to findr magic link if this appears to be a findr-related auth flow
  const isFindrFlow = url.searchParams.get('app') === 'findr' || 
                      url.pathname.startsWith('/findr') ||
                      req.headers.get('referer')?.includes('/findr') ||
                      req.headers.get('host')?.includes('fishfindr.eu');

  if ((hasCode || hasTokenHash)) {
    if (isFindrFlow && url.pathname !== '/findr/magic-link') {
      const to = url.clone();
      to.pathname = '/findr/magic-link';
      return NextResponse.redirect(to);
    } else if (!isFindrFlow && url.pathname !== '/auth/callback') {
      const to = url.clone();
      to.pathname = '/auth/callback';
      return NextResponse.redirect(to);
    }
  }
  
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };