import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_auth';
const COOKIE_VALUE = 'authenticated';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Redirect webinar.nekst.com root → /register
  if (hostname === 'webinar.nekst.com' && pathname === '/') {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  // Protect the admin dashboard at /
  if (pathname === '/') {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (cookie?.value !== COOKIE_VALUE) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on / and /login only (not on /register, /api/*, _next/*, etc.)
  matcher: ['/', '/login'],
};
