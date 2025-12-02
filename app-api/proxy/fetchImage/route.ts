import { NextRequest, NextResponse } from 'next/server';

/**
 * 画像取得プロキシAPI（開発環境用）
 * CORSを回避して画像をBase64で返す
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'URL is required' },
      { status: 400 }
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
      return NextResponse.json(
        { error: '許可されていないドメインです' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: '無効なURLです' },
      { status: 400 }
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
      return NextResponse.json(
        {
          error: '画像の取得に失敗しました',
          status: response.status,
        },
        { status: response.status }
      );
    }

    // Content-Typeを取得
    const contentType = response.headers.get('Content-Type') || 'image/png';

    // 画像かどうかチェック
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルではありません' },
        { status: 400 }
      );
    }

    // バイナリデータを取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Base64エンコード
    const base64 = Buffer.from(uint8Array).toString('base64');

    return NextResponse.json({
      data: base64,
      mimeType: contentType,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: '画像の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
