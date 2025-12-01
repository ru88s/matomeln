import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import Encoding from 'encoding-japanese';

// 5ch URLから情報を抽出
interface FiveChThreadInfo {
  server: string;
  board: string;
  threadKey: string;
}

function parse5chUrl(url: string): FiveChThreadInfo | null {
  const patterns = [
    // 標準形式
    /https?:\/\/([a-z0-9]+)\.5ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i,
    // DAT直接
    /https?:\/\/([a-z0-9]+)\.5ch\.net\/([a-z0-9_]+)\/dat\/(\d+)\.dat/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        server: match[1],
        board: match[2],
        threadKey: match[3],
      };
    }
  }

  return null;
}

// DATファイルのURLを生成（複数パターンを試す）
function generateDatUrls(info: FiveChThreadInfo): string[] {
  const { server, board, threadKey } = info;
  const keyPrefix = threadKey.substring(0, 4);

  return [
    // 稼働中のスレッド
    `https://${server}.5ch.net/${board}/dat/${threadKey}.dat`,
    // DAT落ちした現役サーバのスレッド
    `https://${server}.5ch.net/${board}/oyster/${keyPrefix}/${threadKey}.dat`,
  ];
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

  const threadInfo = parse5chUrl(url);
  if (!threadInfo) {
    return NextResponse.json(
      { error: '無効な5ch URLです' },
      { status: 400 }
    );
  }

  const datUrls = generateDatUrls(threadInfo);
  let lastError: Error | null = null;

  // 複数のURLパターンを順番に試す
  for (const datUrl of datUrls) {
    try {
      logger.log(`Trying to fetch DAT from: ${datUrl}`);

      const response = await fetch(datUrl, {
        headers: {
          'User-Agent': 'Monazilla/1.00 ShikuMato/1.0',
          'Accept-Encoding': 'gzip',
        },
      });

      if (response.ok) {
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
      }

      logger.log(`DAT not found at: ${datUrl} (status: ${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.error(`Error fetching DAT from ${datUrl}:`, error);
    }
  }

  // すべてのURLパターンで失敗
  return NextResponse.json(
    {
      error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
      details: lastError?.message,
      triedUrls: datUrls,
    },
    { status: 404 }
  );
}
