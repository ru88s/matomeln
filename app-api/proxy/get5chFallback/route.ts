import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import Encoding from 'encoding-japanese';

// 5ch URLから情報を抽出して2ch.scのDATを取得するフォールバックAPI

interface ThreadInfo {
  server: string;
  board: string;
  threadKey: string;
}

function parse5chUrl(url: string): ThreadInfo | null {
  // モバイル版URLを正規化
  const normalizedUrl = normalize5chUrl(url);

  const patterns = [
    // 標準形式: https://server.5ch.net/test/read.cgi/board/threadkey/（5ch.net と 5ch.io 両対応）
    /https?:\/\/([a-z0-9]+)\.5ch\.(?:net|io)\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)\/?/i,
    // DAT直接: https://server.5ch.net/board/dat/threadkey.dat
    /https?:\/\/([a-z0-9]+)\.5ch\.(?:net|io)\/([a-z0-9_]+)\/dat\/(\d+)\.dat/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedUrl.match(pattern);
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

function normalize5chUrl(url: string): string {
  // itest.5ch.net/io形式: https://itest.5ch.net/server/test/read.cgi/board/threadkey
  const itestPattern = /https?:\/\/itest\.5ch\.(?:net|io)\/([a-z0-9]+)\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i;
  const itestMatch = url.match(itestPattern);

  if (itestMatch) {
    const server = itestMatch[1];
    const board = itestMatch[2];
    const threadKey = itestMatch[3];
    return `https://${server}.5ch.io/test/read.cgi/${board}/${threadKey}/`;
  }

  // 旧ドメイン 5ch.net を 5ch.io に変換
  return url.replace(/\.5ch\.net\//g, '.5ch.io/');
}

// 2ch.scのDATファイルURLを生成
function generate2chscDatUrls(info: ThreadInfo): string[] {
  const { board, threadKey } = info;
  const keyPrefix = threadKey.substring(0, 4);

  return [
    // tomcat.2ch.sc を使用（5chと同じスレッドがミラーされている）
    `https://tomcat.2ch.sc/${board}/dat/${threadKey}.dat`,
    // DAT落ちした過去ログ
    `https://tomcat.2ch.sc/${board}/oyster/${keyPrefix}/${threadKey}.dat`,
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

  const threadInfo = parse5chUrl(url);
  if (!threadInfo) {
    return NextResponse.json(
      { error: '無効な5ch URLです' },
      { status: 400 }
    );
  }

  const datUrls = generate2chscDatUrls(threadInfo);
  let lastError: Error | null = null;
  let lastStatus = 404;

  // 複数のURLパターンを順番に試す
  for (const datUrl of datUrls) {
    try {
      logger.log(`Trying 2ch.sc fallback: ${datUrl}`);

      const response = await fetch(datUrl, {
        headers: {
          'User-Agent': 'Monazilla/1.00',
          'Accept-Encoding': 'gzip',
        },
      });

      if (response.ok) {
        // バイナリデータとして取得
        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const decoded = decodeDatContent(uint8Array);

        logger.log(`Successfully fetched from 2ch.sc: ${datUrl} (${decoded.encoding}, score: ${decoded.score.toFixed(1)})`);

        return NextResponse.json({
          content: decoded.content,
          threadInfo,
          datUrl,
          encoding: decoded.encoding,
          source: '2ch.sc',
        });
      } else {
        lastStatus = response.status;
        logger.log(`2ch.sc returned ${response.status} for ${datUrl}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.error(`Error fetching from 2ch.sc:`, error);
    }
  }

  // すべてのURLパターンで失敗
  return NextResponse.json(
    {
      error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
      details: lastError?.message,
      triedUrls: datUrls,
    },
    { status: lastStatus }
  );
}
