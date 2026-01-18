// Google OAuth callback endpoint
import {
  exchangeCodeForTokens,
  decodeIdToken,
  generateId,
  parseCookies,
  createSessionCookie,
  SESSION_DURATION_MS,
  isAllowed,
  getRoleForEmail,
  ADMIN_EMAIL,
} from '../../../lib/auth';

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_REDIRECT_URI: string;
  DB: D1Database;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env, request } = context;
  const url = new URL(request.url);

  // Get authorization code and state from query params
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle errors from Google
  if (error) {
    console.error('OAuth error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=oauth_error',
      },
    });
  }

  if (!code || !state) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=missing_params',
      },
    });
  }

  // Verify state from cookie
  const cookies = parseCookies(request.headers.get('Cookie'));
  const storedState = cookies['auth_state'];

  if (!storedState) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=invalid_state',
      },
    });
  }

  const [expectedState, returnTo] = storedState.split('|');

  if (state !== expectedState) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=state_mismatch',
      },
    });
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.AUTH_REDIRECT_URI
    );

    // Decode ID token to get user info
    const userInfo = decodeIdToken(tokens.id_token);

    // Phase 1: Only allow admin
    // Phase 2: Use isAllowed() for allowlist
    if (!isAllowed(userInfo.email)) {
      console.log(`Access denied for: ${userInfo.email}`);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login?error=access_denied',
          'Set-Cookie': 'auth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
        },
      });
    }

    // Determine role
    const role = getRoleForEmail(userInfo.email);

    // Upsert user in database
    const userId = generateId();
    await env.DB.prepare(`
      INSERT INTO users (id, email, name, image, role, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        image = excluded.image,
        role = CASE WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END,
        updated_at = datetime('now')
    `).bind(
      userId,
      userInfo.email,
      userInfo.name,
      userInfo.picture,
      role
    ).run();

    // Get the actual user ID (might be existing user)
    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(userInfo.email).first<{ id: string }>();

    if (!user) {
      throw new Error('Failed to create/find user');
    }

    // Create session
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, user.id, expiresAt.toISOString()).run();

    // Create session cookie and redirect
    const sessionCookie = createSessionCookie(sessionId, expiresAt);
    const clearStateCookie = 'auth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

    // Validate returnTo is a relative path (prevent open redirect)
    const safeReturnTo = (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) ? returnTo : '/';

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', safeReturnTo],
        ['Set-Cookie', sessionCookie],
        ['Set-Cookie', clearStateCookie],
      ],
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/?error=auth_failed',
      },
    });
  }
}
