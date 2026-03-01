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

export async function onRequest(context: any) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
  };

  const urlObj = new URL(request.url);
  const url = urlObj.searchParams.get('url');

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URLが指定されていません' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const threadInfo = parse2chscUrl(url);
  if (!threadInfo) {
    return new Response(
      JSON.stringify({ error: '無効な2ch.sc URLです' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const datUrls = generateDatUrls(threadInfo);
  let lastError: Error | null = null;

  // 複数のURLパターンを順番に試す
  for (const datUrl of datUrls) {
    try {
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

        return new Response(
          JSON.stringify({
            content,
            threadInfo,
            datUrl,
          }),
          { status: 200, headers: corsHeaders }
        );
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
    { status: 404, headers: corsHeaders }
  );
}
