// Logout endpoint - clears session
import {
  parseCookies,
  createClearSessionCookie,
  SESSION_COOKIE_NAME,
} from '../../../lib/auth';

interface Env {
  DB: D1Database;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env, request } = context;

  // Get session from cookie
  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionId = cookies[SESSION_COOKIE_NAME];

  // Delete session from database if exists
  if (sessionId) {
    try {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }

  // Clear cookie and redirect to home
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': createClearSessionCookie(),
    },
  });
}
