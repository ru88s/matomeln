import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShikumatoBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();

    // Content-Typeヘッダーから文字コードを取得
    const contentType = response.headers.get('content-type') || '';
    const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
    let charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';

    // HTMLから文字コードを検出（metaタグから）
    if (!charsetMatch) {
      const preliminaryHtml = new TextDecoder('utf-8').decode(buffer.slice(0, 2000));
      const metaCharset = preliminaryHtml.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
      if (metaCharset) {
        charset = metaCharset[1].toLowerCase();
      }
    }

    // 文字コードの正規化
    const normalizedCharset = charset
      .replace('shift_jis', 'shift-jis')
      .replace('euc-jp', 'euc-jp')
      .replace('iso-2022-jp', 'iso-2022-jp');

    // デコード
    const html = new TextDecoder(normalizedCharset).decode(buffer);

    // OGPタグを抽出
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || '';
    const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] || '';
    const ogSiteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i)?.[1] || '';

    // フォールバック: titleタグ
    const title = ogTitle || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

    // フォールバック: descriptionメタタグ
    const description = ogDescription || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || '';

    return NextResponse.json({
      title: decodeHTMLEntities(title),
      description: decodeHTMLEntities(description),
      image: ogImage,
      siteName: ogSiteName,
      url,
    });
  } catch (error) {
    logger.error('OGP fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OGP data' },
      { status: 500 }
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
