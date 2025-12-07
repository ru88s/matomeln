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
  const urlObj = new URL(request.url);
  const url = urlObj.searchParams.get('url');

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URL is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const threadInfo = parseOpen2chUrl(url);
  if (!threadInfo) {
    return new Response(
      JSON.stringify({ error: '無効なopen2ch URLです' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
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
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'DATファイルの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
