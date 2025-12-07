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
    // 標準形式: https://server.5ch.net/test/read.cgi/board/threadkey/
    /https?:\/\/([a-z0-9]+)\.5ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)\/?/i,
    // DAT直接: https://server.5ch.net/board/dat/threadkey.dat
    /https?:\/\/([a-z0-9]+)\.5ch\.net\/([a-z0-9_]+)\/dat\/(\d+)\.dat/i,
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
  // itest.5ch.net形式: https://itest.5ch.net/server/test/read.cgi/board/threadkey
  const itestPattern = /https?:\/\/itest\.5ch\.net\/([a-z0-9]+)\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i;
  const itestMatch = url.match(itestPattern);

  if (itestMatch) {
    const server = itestMatch[1];
    const board = itestMatch[2];
    const threadKey = itestMatch[3];
    return `https://${server}.5ch.net/test/read.cgi/${board}/${threadKey}/`;
  }

  return url;
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

export async function onRequest(context: any) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const url = urlObj.searchParams.get('url');

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URLが指定されていません' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const threadInfo = parse5chUrl(url);
  if (!threadInfo) {
    return new Response(
      JSON.stringify({ error: '無効な5ch URLです' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const datUrls = generate2chscDatUrls(threadInfo);
  let lastError: Error | null = null;
  let lastStatus = 404;

  // 複数のURLパターンを順番に試す
  for (const datUrl of datUrls) {
    try {
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

        // 2ch.scはShift_JISなので変換
        let content: string;
        const detectedEncoding = Encoding.detect(uint8Array);

        if (detectedEncoding === 'SJIS' || detectedEncoding === 'EUCJP' || detectedEncoding === 'ASCII') {
          // Shift_JIS または EUC-JP をUTF-8に変換
          const unicodeArray = Encoding.convert(uint8Array, {
            to: 'UNICODE',
            from: detectedEncoding === 'ASCII' ? 'SJIS' : detectedEncoding,
          });
          content = Encoding.codeToString(unicodeArray);
        } else {
          // UTF-8の場合はそのままデコード
          content = new TextDecoder('utf-8').decode(uint8Array);
        }

        return new Response(
          JSON.stringify({
            content,
            threadInfo,
            datUrl,
            source: '2ch.sc',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else {
        lastStatus = response.status;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  // すべてのURLパターンで失敗
  return new Response(
    JSON.stringify({
      error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
      details: lastError?.message,
      triedUrls: datUrls,
    }),
    {
      status: lastStatus,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
