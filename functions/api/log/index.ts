// Activity logging endpoint
// Logs user actions for analytics and debugging

interface Env {
  DB: D1Database;
}

interface LogRequest {
  action: string;
  details?: Record<string, unknown>;
}

// Get user ID from session cookie
async function getUserIdFromSession(request: Request, db: D1Database): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const sessionMatch = cookieHeader.match(/matomeln_session=([^;]+)/);
  if (!sessionMatch) return null;

  const sessionId = sessionMatch[1];
  const session = await db.prepare(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime("now")'
  ).bind(sessionId).first<{ user_id: string }>();

  return session?.user_id || null;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json() as LogRequest;
    const { action, details } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user ID from session
    const userId = await getUserIdFromSession(request, db);

    // Get client info
    const ipAddress = request.headers.get('cf-connecting-ip') ||
                      request.headers.get('x-forwarded-for') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert log
    await db.prepare(`
      INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      action,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent.substring(0, 500) // Limit user agent length
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logging error:', error);
    // Don't fail the request if logging fails
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
