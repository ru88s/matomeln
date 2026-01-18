// Authentication types and utilities

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'admin' | 'free' | 'partner';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

// Admin email - the only user allowed in Phase 1
export const ADMIN_EMAIL = 'lulu.y0812@gmail.com';

// Allowlist for future Phase 2 (empty for now, admin only)
export const ALLOWLIST_EMAILS: string[] = [
  ADMIN_EMAIL,
];

// Check if email is admin
export function isAdmin(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Check if email is in allowlist
export function isAllowed(email: string): boolean {
  return ALLOWLIST_EMAILS.some(
    allowed => allowed.toLowerCase() === email.toLowerCase()
  );
}

// Get role for email
export function getRoleForEmail(email: string): 'admin' | 'free' {
  return isAdmin(email) ? 'admin' : 'free';
}

// Session cookie name
export const SESSION_COOKIE_NAME = 'matomeln_session';

// Session duration: 7 days
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Generate random ID
export function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Parse cookie header
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

// Create Set-Cookie header for session
export function createSessionCookie(sessionId: string, expiresAt: Date): string {
  const expires = expiresAt.toUTCString();
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

// Create Set-Cookie header to clear session
export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Google OAuth URLs
export function getGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; id_token: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Decode JWT ID token to get user info
export function decodeIdToken(idToken: string): {
  email: string;
  name: string;
  picture: string;
  sub: string;
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token');
  }

  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

  return {
    email: payload.email,
    name: payload.name || '',
    picture: payload.picture || '',
    sub: payload.sub,
  };
}
