import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Session cookie name (must match lib/auth.ts)
const SESSION_COOKIE_NAME = 'matomeln_session';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/auth/me',
  '/login',
  '/privacy',
  '/terms',
  '/contact',
  '/about',
  '/site-map',
  '/sitemap.xml',
  '/robots.txt',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json',
  '/og-image.png',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  // Static assets
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    return true;
  }

  // Check exact matches and prefixes
  for (const publicPath of PUBLIC_PATHS) {
    if (pathname === publicPath || pathname.startsWith(publicPath + '/')) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    // No session - redirect to login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists - allow access
  // Note: Session validation is done server-side in API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
