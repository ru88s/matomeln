/**
 * ガールズちゃんねる新着トピック取得API
 * 新着ページをスクレイピングしてトピックURLを取得
 */

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
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const page = parseInt(url.searchParams.get('page') || '1', 10);

  try {
    // ガールズちゃんねるの新着トピックページを取得
    const targetUrl = `https://girlschannel.net/topics/new/?page=${page}`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const html = await response.text();

    // トピックURLを抽出
    // パターン: <a href="/topics/1234567/" class="topic-link">
    const topicPattern = /href="(\/topics\/(\d+)\/)"/g;
    const urls: string[] = [];
    const seenIds = new Set<string>();
    let match;

    while ((match = topicPattern.exec(html)) !== null) {
      const topicId = match[2];
      if (!seenIds.has(topicId)) {
        seenIds.add(topicId);
        urls.push(`https://girlschannel.net/topics/${topicId}/`);
      }
    }

    // limitで制限
    const limitedUrls = urls.slice(0, limit);

    return new Response(
      JSON.stringify({
        urls: limitedUrls,
        count: limitedUrls.length,
        totalFound: urls.length,
        page,
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
    console.error('Error fetching GirlsChannel new topics:', error);
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
