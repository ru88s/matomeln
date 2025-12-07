import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import Encoding from 'encoding-japanese';

// open2ch URLから情報を抽出
interface Open2chThreadInfo {
  subdomain: string | null;
  board: string;
  threadKey: string;
}

function parseOpen2chUrl(url: string): Open2chThreadInfo | null {
  // https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890/
  // https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890 (末尾/なし)
  // https://open2ch.net/test/read.cgi/livejupiter/1732936890/
  const pattern = /https?:\/\/(?:([a-z0-9]+)\.)?open2ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)\/?/i;
  const match = url.match(pattern);

  if (match) {
    return {
      subdomain: match[1] || null,
      board: match[2],
      threadKey: match[3],
    };
  }

  return null;
}

// DATファイルのURLを生成
function generateDatUrl(info: Open2chThreadInfo): string {
  const { subdomain, board, threadKey } = info;
  // open2chのDATファイル形式
  // https://hayabusa.open2ch.net/livejupiter/dat/1732936890.dat
  // または https://open2ch.net/livejupiter/dat/1732936890.dat
  const host = subdomain ? `${subdomain}.open2ch.net` : 'open2ch.net';
  return `https://${host}/${board}/dat/${threadKey}.dat`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URLが指定されていません' },
      { status: 400 }
    );
  }

  const threadInfo = parseOpen2chUrl(url);
  if (!threadInfo) {
    return NextResponse.json(
      { error: '無効なopen2ch URLです' },
      { status: 400 }
    );
  }

  const datUrl = generateDatUrl(threadInfo);

  try {
    logger.log(`Fetching open2ch DAT from: ${datUrl}`);

    const response = await fetch(datUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/plain, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      logger.log(`open2ch DAT fetch failed: ${response.status}`);
      return NextResponse.json(
        {
          error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
          status: response.status,
          datUrl,
        },
        { status: 404 }
      );
    }

    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // 文字コードを検出してUTF-8に変換
    const detectedEncoding = Encoding.detect(uint8Array);
    logger.log(`Detected encoding: ${detectedEncoding}`);

    let content: string;
    if (detectedEncoding === 'SJIS' || detectedEncoding === 'EUCJP') {
      // Shift_JIS または EUC-JP をUTF-8に変換
      const unicodeArray = Encoding.convert(uint8Array, {
        to: 'UNICODE',
        from: detectedEncoding,
      });
      content = Encoding.codeToString(unicodeArray);
    } else {
      // UTF-8の場合はそのままデコード
      content = new TextDecoder('utf-8').decode(uint8Array);
    }

    return NextResponse.json({
      content,
      threadInfo,
      datUrl,
    });
  } catch (error) {
    logger.error(`Error fetching open2ch DAT:`, error);
    return NextResponse.json(
      {
        error: 'DATファイルの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
