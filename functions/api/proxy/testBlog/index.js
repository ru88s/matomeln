async function generateWSSEHeader(username, password) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const created = new Date().toISOString();
  const encoder = new TextEncoder();
  const data = encoder.encode(nonce + created + password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const digest = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  const nonceBase64 = btoa(nonce);

  return `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
}

async function testLivedoorBlog(blogId, apiUsername, apiKey) {
  const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/article`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: 'WSSE profile="UsernameToken"',
      'X-WSSE': await generateWSSEHeader(apiUsername || blogId, apiKey),
      Accept: 'application/atom+xml,application/xml,text/xml,*/*',
    },
  });

  if (response.ok) {
    return { ok: true, status: 'normal', message: '正常', httpStatus: response.status };
  }

  const body = await response.text().catch(() => '');
  if (response.status === 401) {
    return { ok: false, status: 'auth_error', message: '認証NG', httpStatus: response.status, details: body };
  }
  if (response.status === 403) {
    return { ok: false, status: 'permission_error', message: '権限NG', httpStatus: response.status, details: body };
  }
  if (response.status === 404) {
    return { ok: false, status: 'not_found', message: 'ブログIDなし', httpStatus: response.status, details: body };
  }

  return { ok: false, status: 'api_error', message: `APIエラー ${response.status}`, httpStatus: response.status, details: body };
}

async function testHttpApi(apiUrl, apiKey, blogType) {
  const baseUrl = apiUrl.replace(/\/$/, '');
  const response = await fetch(baseUrl, {
    method: 'GET',
    headers: blogType === 'kotoria'
      ? { Authorization: `Bearer ${apiKey}` }
      : { 'X-API-Key': apiKey },
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 'auth_error', message: '認証NG', httpStatus: response.status };
  }
  if (response.status === 404) {
    return { ok: false, status: 'not_found', message: 'URLなし', httpStatus: response.status };
  }

  return {
    ok: response.status < 500,
    status: response.status < 500 ? 'reachable' : 'api_error',
    message: response.status < 500 ? '接続OK' : `接続NG ${response.status}`,
    httpStatus: response.status,
  };
}

export async function onRequest(context) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, status: 'method_not_allowed', message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { blogId, apiUsername, apiKey, blogType = 'livedoor' } = await context.request.json();

    if (!blogId || !apiKey) {
      return new Response(JSON.stringify({ ok: false, status: 'missing_params', message: '設定不足' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const result = blogType === 'livedoor'
      ? await testLivedoorBlog(blogId, apiUsername, apiKey)
      : await testHttpApi(blogId, apiKey, blogType);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return new Response(JSON.stringify({ ok: false, status: 'connection_error', message: '接続NG', details: message }), {
      status: 200,
      headers: corsHeaders,
    });
  }
}
