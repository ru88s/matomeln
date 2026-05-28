/**
 * タグ検索APIプロキシ（Cloudflare Functions版）
 * スレメモくんのタグDBからタイトルでタグを検索
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

  // OPTIONSリクエスト（CORS preflight）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // GETリクエスト：タイトルでタグ検索
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const title = url.searchParams.get('title') || '';

    try {
      const params = new URLSearchParams();
      if (title) params.append('title', title);

      const response = await fetch(
        `${THREAD_MEMO_BASE_URL}/api/tags/search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${response.status}: ${errorText}` }),
          {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  }

  // その他のメソッド
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}
