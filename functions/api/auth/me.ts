// Get current user endpoint
import {
  parseCookies,
  SESSION_COOKIE_NAME,
  User,
} from '../../../lib/auth';

interface Env {
  DB: D1Database;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env, request } = context;

  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Get session from cookie
  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return new Response(
      JSON.stringify({ user: null }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    // Get session and user from database
    const result = await env.DB.prepare(`
      SELECT u.id, u.email, u.name, u.image, u.role, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `).bind(sessionId).first<User>();

    if (!result) {
      return new Response(
        JSON.stringify({ user: null }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ user: result }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Error fetching user:', err);
    return new Response(
      JSON.stringify({ user: null, error: 'Database error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
