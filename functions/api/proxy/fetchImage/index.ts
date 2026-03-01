/**
 * 画像取得プロキシAPI
 * CORSを回避して画像をBase64で返す
 */

export async function onRequest(context: any) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const imageUrl = urlObj.searchParams.get('url');

  // CORSヘッダー（許可するオリジンを制限）
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONSリクエストへの対応
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!imageUrl) {
    return new Response(
      JSON.stringify({ error: 'URL is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // URLの検証（画像URLのみ許可）
  try {
    const parsedUrl = new URL(imageUrl);
    // 許可するドメインのリスト
    const allowedDomains = [
      'livedoor.blogimg.jp',
      'livedoor.sp.blogimg.jp',
      'shikutoku.me',
    ];

    const isAllowed = allowedDomains.some(domain =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: '許可されていないドメインです' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: '無効なURLです' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
        'Referer': 'https://livedoor.blogcms.jp/',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: '画像の取得に失敗しました',
          status: response.status,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Content-Typeを取得
    const contentType = response.headers.get('Content-Type') || 'image/png';

    // 画像かどうかチェック
    if (!contentType.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: '画像ファイルではありません' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // バイナリデータを取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Base64エンコード
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    return new Response(
      JSON.stringify({
        data: base64,
        mimeType: contentType,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: '画像の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}
