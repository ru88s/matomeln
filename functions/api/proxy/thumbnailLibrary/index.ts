/**
 * スレメモくん共有サムネイルライブラリAPIプロキシ（Cloudflare Functions版）
 */

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequest(context: { request: Request }) {
  const { request } = context;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const title = url.searchParams.get('title') || '';

    try {
      const params = new URLSearchParams();
      if (title) params.append('title', title);

      const response = await fetch(`${THREAD_MEMO_BASE_URL}/api/thumbnails?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const responseText = await response.text();
      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json() as { action?: string; id?: string; title?: string; imageUrl?: string; category?: string; keywords?: string[]; style?: string };
      const endpoint = body.action === 'use' ? '/api/thumbnails/use' : '/api/thumbnails';
      const payload = body.action === 'use'
        ? { id: body.id }
        : {
            title: body.title,
            imageUrl: body.imageUrl,
            category: body.category,
            keywords: body.keywords,
            style: body.style,
          };

      const response = await fetch(`${THREAD_MEMO_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
