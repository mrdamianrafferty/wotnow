import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Redirect fishfindr.eu to /findr
  if (hostname === 'fishfindr.eu' || hostname === 'www.fishfindr.eu') {
    // If not already on /findr path, redirect to /findr
    if (!url.pathname.startsWith('/findr')) {
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