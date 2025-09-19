import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hasCode = url.searchParams.has('code');
  const hasTokenHash = url.searchParams.has('token_hash') || url.searchParams.has('token');

  if ((hasCode || hasTokenHash) && url.pathname !== '/auth/callback') {
    const to = url.clone();
    to.pathname = '/auth/callback';
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };