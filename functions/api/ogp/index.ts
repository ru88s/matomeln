import Encoding from 'encoding-japanese';

export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'URL parameter is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShikumatoBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // 文字コード自動検出
    const detectedEncoding = Encoding.detect(uint8Array);

    // UNICODEに変換
    const unicodeArray = Encoding.convert(uint8Array, {
      to: 'UNICODE',
      from: detectedEncoding || 'AUTO',
    });

    // 文字列に変換
    const html = Encoding.codeToString(unicodeArray);

    // OGPタグを抽出
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || '';
    const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] || '';
    const ogSiteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i)?.[1] || '';

    // フォールバック: titleタグ
    const title = ogTitle || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

    // フォールバック: descriptionメタタグ
    const description = ogDescription || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || '';

    return new Response(
      JSON.stringify({
        title: decodeHTMLEntities(title),
        description: decodeHTMLEntities(description),
        image: ogImage,
        siteName: ogSiteName,
        url: targetUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // 本番環境ではログを出力しない（Cloudflare Logsで確認可能）
    if (process.env.NODE_ENV === 'development') {
      console.error('OGP fetch error:', error);
    }
    return new Response(
      JSON.stringify({ error: 'Failed to fetch OGP data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  return text.replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (match) => {
    // 名前付きエンティティ
    if (entities[match]) {
      return entities[match];
    }

    // 数値文字参照（10進数: &#1234;）
    if (match.startsWith('&#') && !match.startsWith('&#x')) {
      const code = parseInt(match.slice(2, -1), 10);
      return String.fromCharCode(code);
    }

    // 数値文字参照（16進数: &#x1a2b;）
    if (match.startsWith('&#x')) {
      const code = parseInt(match.slice(3, -1), 16);
      return String.fromCharCode(code);
    }

    return match;
  });
}