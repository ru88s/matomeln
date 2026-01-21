/**
 * Shikutoku未まとめURL取得API（スレメモくん経由）
 */

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (request.method !== 'GET') {
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

  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '1000';

  try {
    // スレメモくんから未まとめURL一覧を取得
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('source', 'shikutoku'); // Shikutokuのみ

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

    const data = await response.json() as { urls: string[]; count: number };

    // ShikutokuURLのみフィルタ（念のため）
    const filteredUrls = data.urls.filter((u: string) => u.includes('shikutoku.me'));

    return new Response(
      JSON.stringify({
        urls: filteredUrls,
        count: filteredUrls.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching Shikutoku URLs from thread-memo:', error);
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
