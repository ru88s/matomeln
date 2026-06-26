// Cloudflare Functions - talk.jpスレッド取得

function decodeScriptJson(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseTalkJpUrl(targetUrl: string): { board: string; thread: string } | null {
  const match = targetUrl.match(/^https?:\/\/talk\.jp\/boards\/([a-z0-9_]+)\/(\d+)\/?/i);
  if (!match) return null;
  return {
    board: match[1],
    thread: match[2],
  };
}

export async function onRequest(context: any) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
  };

  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'URL parameter is required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const threadInfo = parseTalkJpUrl(targetUrl);
  if (!threadInfo) {
    return new Response(
      JSON.stringify({ error: 'Invalid talk.jp URL' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const apiUrl = `https://talk.jp/api/boards/${threadInfo.board}/threads/${threadInfo.thread}`;
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': targetUrl,
      },
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json() as { data?: unknown };
      if (data.data && typeof data.data === 'object') {
        return new Response(
          JSON.stringify({ thread: data.data }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: corsHeaders }
      );
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'talk.jpスレッドデータを取得できませんでした' }),
        { status: 502, headers: corsHeaders }
      );
    }

    const nextData = JSON.parse(decodeScriptJson(match[1])) as {
      props?: {
        pageProps?: {
          threadData?: {
            data?: unknown;
          };
        };
      };
    };
    const thread = nextData.props?.pageProps?.threadData?.data;

    if (!thread || typeof thread !== 'object') {
      return new Response(
        JSON.stringify({ error: 'talk.jpスレッドデータの形式が不正です' }),
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ thread }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
