// Cloudflare Functions - ガールズちゃんねるHTML取得

export async function onRequest(context: any) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';

  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // URLの検証
  if (!targetUrl.match(/^https?:\/\/girlschannel\.net\/topics\/\d+/)) {
    return new Response(JSON.stringify({ error: 'Invalid GirlsChannel URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // ガールズちゃんねるのHTMLを取得
    // 全コメントを取得するためにall=trueパラメータを追加
    const fetchUrl = targetUrl.includes('?')
      ? `${targetUrl}&all=true`
      : `${targetUrl}?all=true`;

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Failed to fetch: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = await response.text();

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
      },
    });
  } catch (error) {
    console.error('Error fetching GirlsChannel:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
