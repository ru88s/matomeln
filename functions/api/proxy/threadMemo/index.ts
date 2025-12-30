/**
 * thread-memo API プロキシ（Cloudflare Functions版）
 * 未まとめURL取得・まとめ済み登録
 */

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context: { request: Request }) {
  const { request } = context;

  // OPTIONSリクエスト（CORS preflight）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // GETリクエスト：未まとめURL取得
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    const lifeOnly = url.searchParams.get('lifeOnly') === 'true';
    const limit = url.searchParams.get('limit') || '1000';

    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (lifeOnly) params.append('lifeOnly', 'true');
      params.append('limit', limit);

      const response = await fetch(
        `${THREAD_MEMO_BASE_URL}/api/threads/unsummarized?${params.toString()}`,
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

  // POSTリクエスト：まとめ済み登録
  if (request.method === 'POST') {
    try {
      const body = await request.json() as { url?: string };
      const { url } = body;

      if (!url) {
        return new Response(
          JSON.stringify({ error: 'URL is required' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      const response = await fetch(
        `${THREAD_MEMO_BASE_URL}/api/threads/mark-summarized`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
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
