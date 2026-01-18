import Encoding from 'encoding-japanese';

// 5ch URLから情報を抽出して5ch.net直接またはか2ch.scのDATを取得するAPI

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

// 試行するURLを生成（5ch.net直接 + 2ch.scフォールバック）
function generateAllDatUrls(info: ThreadInfo): { url: string; source: string; isHtml?: boolean }[] {
  const { server, board, threadKey } = info;
  const keyPrefix = threadKey.substring(0, 4);

  return [
    // 1. 5ch.net 直接アクセス（Cloudflare Workers経由）
    { url: `https://${server}.5ch.net/${board}/dat/${threadKey}.dat`, source: '5ch.net' },
    // 2. tomcat.2ch.sc（5chミラー）
    { url: `https://tomcat.2ch.sc/${board}/dat/${threadKey}.dat`, source: '2ch.sc' },
    // 3. サーバー名.2ch.sc
    { url: `https://${server}.2ch.sc/${board}/dat/${threadKey}.dat`, source: '2ch.sc' },
    // 4. DAT落ち過去ログ（tomcat）
    { url: `https://tomcat.2ch.sc/${board}/oyster/${keyPrefix}/${threadKey}.dat`, source: '2ch.sc-kako' },
    // 5. DAT落ち過去ログ（サーバー名）
    { url: `https://${server}.2ch.sc/${board}/oyster/${keyPrefix}/${threadKey}.dat`, source: '2ch.sc-kako' },
    // 6. 5ch.net HTML版（最後の手段）
    { url: `https://${server}.5ch.net/test/read.cgi/${board}/${threadKey}/`, source: '5ch.net-html', isHtml: true },
  ];
}

// 5ch HTMLをDATフォーマットに変換
function parseHtmlToDat(html: string): string {
  const lines: string[] = [];

  // スレッドタイトルを取得
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let threadTitle = '';
  if (titleMatch) {
    threadTitle = titleMatch[1].replace(/\s*\n\s*/g, '').trim();
  }

  // 各レスを抽出（5chのHTML構造に基づく）
  // パターン1: <div class="post">...</div>
  // パターン2: <dt>...</dt><dd>...</dd>
  // パターン3: <article>...</article>

  // パターン: <article data-number="N">形式
  const articlePattern = /<article[^>]*data-number="(\d+)"[^>]*>[\s\S]*?<\/article>/gi;
  let articleMatch;

  while ((articleMatch = articlePattern.exec(html)) !== null) {
    const article = articleMatch[0];
    const resNum = articleMatch[1];

    // 名前を抽出
    const nameMatch = article.match(/<span[^>]*class="[^"]*postusername[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    let name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '名無しさん';

    // 日付とIDを抽出
    const dateMatch = article.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i);
    const dateStr = dateMatch ? dateMatch[1].trim() : '';

    const idMatch = article.match(/ID:([a-zA-Z0-9+\/]+)/);
    const userId = idMatch ? idMatch[1] : '';

    // 本文を抽出
    const messageMatch = article.match(/<section[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
    let body = messageMatch ? messageMatch[1] : '';

    // HTMLタグを適切に変換
    body = body
      .replace(/<br\s*\/?>/gi, ' <br> ')
      .replace(/<a[^>]*href="mailto:[^"]*"[^>]*>([^<]*)<\/a>/gi, '$1')
      .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // DATフォーマット: 名前<>メール<>日付 ID:xxx<>本文<>スレタイ（1レス目のみ）
    const dateWithId = userId ? `${dateStr} ID:${userId}` : dateStr;
    if (lines.length === 0) {
      lines.push(`${name}<><>${dateWithId}<>${body}<>${threadTitle}`);
    } else {
      lines.push(`${name}<><>${dateWithId}<>${body}<>`);
    }
  }

  // articleパターンで取れなかった場合、dt/ddパターンを試す
  if (lines.length === 0) {
    const dtPattern = /<dt[^>]*>(\d+)[^<]*<[^>]*>([^<]*)<\/[^>]*>[^<]*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dtMatch;

    while ((dtMatch = dtPattern.exec(html)) !== null) {
      const name = dtMatch[2].replace(/<[^>]+>/g, '').trim() || '名無しさん';
      let body = dtMatch[3]
        .replace(/<br\s*\/?>/gi, ' <br> ')
        .replace(/<[^>]+>/g, '')
        .trim();

      if (lines.length === 0) {
        lines.push(`${name}<><><>${body}<>${threadTitle}`);
      } else {
        lines.push(`${name}<><><>${body}<>`);
      }
    }
  }

  return lines.join('\n');
}

// 文字化けチェック（簡易版）
function hasMojibake(text: string): boolean {
  // 置換文字（U+FFFD）が多い
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > 50) return true;

  // Shift_JIS→UTF-8誤読パターン
  const sjisPattern = /[繧繝螟髮莉翫縺閾]/g;
  if ((text.match(sjisPattern) || []).length > 30) return true;

  // 日本語文字が少なすぎる（DATなのに）
  const japaneseChars = (text.substring(0, 500).match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  if (text.length > 100 && japaneseChars < 10) return true;

  return false;
}

// バイナリデータを指定エンコーディングでデコード
function decodeWithEncoding(uint8Array: Uint8Array, encoding: 'SJIS' | 'EUCJP' | 'UTF8'): string {
  if (encoding === 'UTF8') {
    return new TextDecoder('utf-8').decode(uint8Array);
  }
  const unicodeArray = Encoding.convert(uint8Array, {
    to: 'UNICODE',
    from: encoding,
  });
  return Encoding.codeToString(unicodeArray);
}

// DATコンテンツを取得してデコード
async function fetchAndDecodeDat(datUrl: string, isHtml: boolean = false): Promise<{ content: string; status: number } | null> {
  try {
    const headers: Record<string, string> = isHtml
      ? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        }
      : {
          'User-Agent': 'Monazilla/1.00',
          'Accept-Encoding': 'gzip',
          'Accept': '*/*',
        };

    const response = await fetch(datUrl, { headers });

    console.log(`[get5chFallback] ${datUrl} -> ${response.status}`);

    if (!response.ok) {
      return { content: '', status: response.status };
    }

    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // 複数のエンコーディングを試す（5chは主にShift_JIS）
    const encodingsToTry: Array<'SJIS' | 'EUCJP' | 'UTF8'> = ['SJIS', 'EUCJP', 'UTF8'];
    let content = '';
    const detectedEncoding = Encoding.detect(uint8Array);
    console.log(`[get5chFallback] Detected encoding: ${detectedEncoding}`);

    // 検出されたエンコーディングを最初に試す（SJIS/EUCJP/UTF8のみ）
    if (detectedEncoding === 'SJIS' || detectedEncoding === 'EUCJP') {
      content = decodeWithEncoding(uint8Array, detectedEncoding);
      if (!hasMojibake(content)) {
        console.log(`[get5chFallback] Using detected encoding: ${detectedEncoding}`);
      } else {
        content = ''; // リセットして他のエンコーディングを試す
      }
    }

    // 検出が失敗または文字化けの場合、順番に試す
    if (!content || hasMojibake(content)) {
      for (const encoding of encodingsToTry) {
        try {
          const decoded = decodeWithEncoding(uint8Array, encoding);
          if (!hasMojibake(decoded)) {
            content = decoded;
            console.log(`[get5chFallback] Using fallback encoding: ${encoding}`);
            break;
          }
        } catch (e) {
          console.log(`[get5chFallback] Failed to decode with ${encoding}`);
        }
      }
    }

    // すべて失敗した場合、最も可能性の高いShift_JISで強制デコード
    if (!content) {
      console.log(`[get5chFallback] Forcing SJIS decode as last resort`);
      content = decodeWithEncoding(uint8Array, 'SJIS');
    }

    // HTML版の場合はDATフォーマットに変換
    if (isHtml) {
      console.log(`[get5chFallback] Parsing HTML (${content.length} chars)...`);
      content = parseHtmlToDat(content);
      console.log(`[get5chFallback] Converted to DAT: ${content.split('\n').length} lines`);
      if (!content || content.split('\n').length === 0) {
        console.log(`[get5chFallback] HTML parsing failed`);
        return { content: '', status: 404 };
      }
    } else {
      // DATフォーマットかどうか確認（<>区切りがあるか）
      if (!content.includes('<>')) {
        console.log(`[get5chFallback] Not DAT format: ${datUrl}`);
        return { content: '', status: 404 };
      }
    }

    return { content, status: 200 };
  } catch (error) {
    console.error(`[get5chFallback] Error fetching ${datUrl}:`, error);
    return null;
  }
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

  const allUrls = generateAllDatUrls(threadInfo);
  const triedUrls: string[] = [];
  const errors: { url: string; status: number }[] = [];

  // 全てのURLパターンを順番に試す
  for (const { url: datUrl, source, isHtml } of allUrls) {
    triedUrls.push(datUrl);
    const result = await fetchAndDecodeDat(datUrl, isHtml || false);

    if (result && result.status === 200 && result.content) {
      console.log(`[get5chFallback] Success: ${datUrl} (${result.content.length} chars)`);
      return new Response(
        JSON.stringify({
          content: result.content,
          threadInfo,
          datUrl,
          source,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (result) {
      errors.push({ url: datUrl, status: result.status });
    }
  }

  // すべてのURLパターンで失敗
  console.error(`[get5chFallback] All URLs failed for ${url}`, errors);
  return new Response(
    JSON.stringify({
      error: 'DATファイルが見つかりませんでした。スレッドが存在しないか、アクセスが制限されている可能性があります。',
      triedUrls,
      errors,
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
