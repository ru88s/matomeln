// Cloudflare Pages Middleware for authentication
// This runs on every request to check if the user is authenticated

interface Env {
  DB: D1Database;
}

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
  '/og-image.svg',
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Allow static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    return context.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return context.next();
  }

  // Allow API routes (except protected ones)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/protected/')) {
    return context.next();
  }

  // Check for session cookie
  const sessionCookie = context.request.headers.get('cookie')?.match(/matomeln_session=([^;]+)/)?.[1];

  if (!sessionCookie) {
    // Redirect to login (only use relative path for returnTo)
    const loginUrl = new URL('/login', url.origin);
    // Only set returnTo for safe relative paths
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('returnTo', pathname);
    }
    return Response.redirect(loginUrl.toString(), 302);
  }

  // Validate session with database
  try {
    const db = context.env.DB;
    if (!db) {
      console.error('D1 database not bound');
      return context.next();
    }

    const session = await db.prepare(
      'SELECT s.*, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
    ).bind(sessionCookie).first<{ user_id: string; email: string; role: string }>();

    if (!session) {
      // Invalid or expired session, redirect to login
      const loginUrl = new URL('/login', url.origin);
      loginUrl.searchParams.set('returnTo', pathname);
      const response = Response.redirect(loginUrl.toString(), 302);
      // Clear invalid cookie
      response.headers.append('Set-Cookie', 'matomeln_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      return response;
    }

    // Session is valid, continue
    return context.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow request to continue (fail open for now)
    return context.next();
  }
};
