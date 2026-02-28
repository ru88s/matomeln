import {
  parseCookies,
  SESSION_COOKIE_NAME,
} from '../../../lib/auth';

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function getUserIdFromSession(request: Request, db: D1Database): Promise<string | null> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return null;

  const result = await db.prepare(`
    SELECT s.user_id
    FROM sessions s
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sessionId).first<{ user_id: string }>();

  return result?.user_id ?? null;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const userId = await getUserIdFromSession(request, env.DB);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT settings FROM user_settings WHERE user_id = ?'
      ).bind(userId).first<{ settings: string }>();

      return new Response(
        JSON.stringify({ settings: row ? JSON.parse(row.settings) : {} }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (request.method === 'POST') {
      const body = await request.json() as { settings: Record<string, unknown> };
      if (!body.settings || typeof body.settings !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Invalid settings' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const settingsJson = JSON.stringify(body.settings);

      await env.DB.prepare(`
        INSERT INTO user_settings (user_id, settings, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          settings = excluded.settings,
          updated_at = excluded.updated_at
      `).bind(userId, settingsJson).run();

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Settings API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
