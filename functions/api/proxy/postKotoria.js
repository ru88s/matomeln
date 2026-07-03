// HTML本文から抜粋を生成
function generateExcerpt(body, maxLength = 160) {
  let text = body.replace(/<[^>]*>/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function onRequest(context) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'https://www.matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const requestData = await context.request.json();
    const { apiUrl, apiKey, title, body, sourceUrl, tags, thumbnailUrl } = requestData;

    if (!apiUrl || !apiKey || !title || !body) {
      return new Response(JSON.stringify({
        error: '必須パラメータが不足しています',
        missing: {
          apiUrl: !apiUrl,
          apiKey: !apiKey,
          title: !title,
          body: !body,
        },
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const response = await fetch(`${baseUrl}/api/kotoria/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title,
        bodyHtml: body,
        excerpt: generateExcerpt(body),
        sourceUrl: sourceUrl || '',
        tags: tags || '',
        thumbnailUrl: thumbnailUrl || '',
        status: 'published',
      }),
    });

    const responseData = await readJsonResponse(response);

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: responseData.error || 'Kotoriaへの投稿に失敗しました',
        details: responseData,
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Kotoriaに投稿しました',
      url: responseData.data?.url,
      data: responseData.data,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('postKotoria error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const details = message === 'fetch failed'
      ? `Kotoria APIへの接続に失敗しました: ${message}`
      : message;
    return new Response(JSON.stringify({
      error: details,
      details,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
