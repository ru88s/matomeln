import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import Encoding from 'encoding-japanese';

// 2ch.sc URLから情報を抽出
interface TwoChScThreadInfo {
  server: string;
  board: string;
  threadKey: string;
}

function parse2chscUrl(url: string): TwoChScThreadInfo | null {
  const patterns = [
    // 標準形式
    /https?:\/\/([a-z0-9]+)\.2ch\.sc\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i,
    // DAT直接
    /https?:\/\/([a-z0-9]+)\.2ch\.sc\/([a-z0-9_]+)\/dat\/(\d+)\.dat/i,
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

// DATファイルのURLを生成
function generateDatUrls(info: TwoChScThreadInfo): string[] {
  const { server, board, threadKey } = info;
  const keyPrefix = threadKey.substring(0, 4);

  return [
    // 稼働中のスレッド
    `https://${server}.2ch.sc/${board}/dat/${threadKey}.dat`,
    // DAT落ちした過去ログ
    `https://${server}.2ch.sc/${board}/oyster/${keyPrefix}/${threadKey}.dat`,
  ];
}

function scoreDecodedContent(content: string): number {
  const sample = content.slice(0, 3000);
  const replacementCount = (sample.match(/\uFFFD/g) || []).length;
  const mojibakeCount = (sample.match(/[繧繝螟髮莉翫縺閾]/g) || []).length;
  const controlCount = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const datSeparators = (sample.match(/<>/g) || []).length;
  const japaneseChars = (sample.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;

  return (
    replacementCount * 120 +
    mojibakeCount * 25 +
    controlCount * 80 -
    datSeparators * 8 -
    japaneseChars * 0.2
  );
}

function decodeDatContent(uint8Array: Uint8Array): { content: string; encoding: string; score: number } {
  const detectedEncoding = Encoding.detect(uint8Array);
  const candidates = new Set<string>(['UTF8', 'SJIS', 'EUCJP']);
  if (typeof detectedEncoding === 'string') {
    candidates.add(detectedEncoding === 'ASCII' ? 'SJIS' : detectedEncoding);
  }

  const decoded = [...candidates].map((encoding) => {
    try {
      if (encoding === 'UTF8') {
        const content = new TextDecoder('utf-8').decode(uint8Array);
        return { content, encoding, score: scoreDecodedContent(content) };
      }
      const unicodeArray = Encoding.convert(uint8Array, {
        to: 'UNICODE',
        from: encoding as Encoding.Encoding,
      });
      const content = Encoding.codeToString(unicodeArray);
      return { content, encoding, score: scoreDecodedContent(content) };
    } catch {
      return null;
    }
  }).filter((item): item is { content: string; encoding: string; score: number } => item !== null);

  decoded.sort((a, b) => a.score - b.score);
  return decoded[0] || {
    content: new TextDecoder('utf-8', { fatal: false }).decode(uint8Array),
    encoding: 'UTF8',
    score: Number.POSITIVE_INFINITY,
  };
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

  const threadInfo = parse2chscUrl(url);
  if (!threadInfo) {
    return NextResponse.json(
      { error: '無効な2ch.sc URLです' },
      { status: 400 }
    );
  }

  const datUrls = generateDatUrls(threadInfo);
  let lastError: Error | null = null;

  // 複数のURLパターンを順番に試す
  for (const datUrl of datUrls) {
    try {
      logger.log(`Trying to fetch 2ch.sc DAT from: ${datUrl}`);

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

        const decoded = decodeDatContent(uint8Array);
        logger.log(`Decoded 2ch.sc DAT using ${decoded.encoding} (score: ${decoded.score.toFixed(1)})`);

        return NextResponse.json({
          content: decoded.content,
          threadInfo,
          datUrl,
          encoding: decoded.encoding,
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
