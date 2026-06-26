const allowedHosts = new Set([
  'girlsvip-matome.com',
  'matomeblade.com',
]);

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function isAllowedArticleUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    if (isPrivateHost(parsed.hostname)) return false;

    const host = parsed.hostname.toLowerCase();
    const isKnownHost =
      allowedHosts.has(host) ||
      host.endsWith('.livedoor.blog') ||
      host === 'blog.livedoor.jp';

    if (!isKnownHost) return false;

    return /\/(?:archives|acv)\/\d+\.html$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function onRequest(context: any) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
  };

  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!isAllowedArticleUrl(targetUrl)) {
    return new Response(JSON.stringify({ error: '対応していないまとめ記事URLです' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.8,en;q=0.6',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      }), {
        status: response.status,
        headers: corsHeaders,
      });
    }

    const content = await response.text();
    return new Response(JSON.stringify({
      content,
      canonicalUrl: response.url || targetUrl,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
