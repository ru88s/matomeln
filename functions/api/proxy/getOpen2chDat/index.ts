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
      JSON.stringify({ error: 'URL is required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const threadInfo = parseOpen2chUrl(url);
  if (!threadInfo) {
    return new Response(
      JSON.stringify({ error: '無効なopen2ch URLです' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const datUrl = generateDatUrl(threadInfo);

  try {
    const response = await fetch(datUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/plain, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
          status: response.status,
          datUrl,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // open2chは基本UTF-8だが、一部古いスレッドでShift_JISの場合がある
    // まずUTF-8でデコードを試み、文字化けがあればShift_JISを試す
    let content: string;

    // UTF-8でデコード
    const utf8Content = new TextDecoder('utf-8').decode(uint8Array);

    // UTF-8が正しくデコードされたか確認（置換文字や明らかな文字化けパターンをチェック）
    const hasReplacementChar = utf8Content.includes('\uFFFD');
    const hasGarbledPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(utf8Content);

    if (hasReplacementChar || hasGarbledPattern) {
      // UTF-8でデコードに問題がある場合、Shift_JISを試す
      const detectedEncoding = Encoding.detect(uint8Array);
      if (detectedEncoding === 'SJIS' || detectedEncoding === 'EUCJP') {
        const unicodeArray = Encoding.convert(uint8Array, {
          to: 'UNICODE',
          from: detectedEncoding,
        });
        content = Encoding.codeToString(unicodeArray);
      } else {
        // 検出できない場合はShift_JISを強制
        const unicodeArray = Encoding.convert(uint8Array, {
          to: 'UNICODE',
          from: 'SJIS',
        });
        content = Encoding.codeToString(unicodeArray);
      }
    } else {
      // UTF-8で正しくデコードできた
      content = utf8Content;
    }

    return new Response(
      JSON.stringify({
        content,
        threadInfo,
        datUrl,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'DATファイルの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
