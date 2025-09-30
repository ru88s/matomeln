import { NextRequest, NextResponse } from 'next/server';

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

    const html = await response.text();

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
    console.error('OGP fetch error:', error);
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
  return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => entities[match] || match);
}
