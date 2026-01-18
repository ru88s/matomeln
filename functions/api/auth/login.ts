// Google OAuth login endpoint
import { getGoogleAuthUrl, generateId } from '../../../lib/auth';

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_REDIRECT_URI: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env, request } = context;

  // Generate state for CSRF protection
  const state = generateId();

  // Get redirect URL after login (default to /)
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';

  // Store state and returnTo in a short-lived cookie
  const stateCookie = `auth_state=${state}|${returnTo}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;

  // Redirect to Google OAuth
  const authUrl = getGoogleAuthUrl(
    env.GOOGLE_CLIENT_ID,
    env.AUTH_REDIRECT_URI,
    state
  );

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Set-Cookie': stateCookie,
    },
  });
}
