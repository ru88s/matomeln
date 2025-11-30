import Encoding from 'encoding-japanese';

// 5ch URLから情報を抽出
function parse5chUrl(url) {
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
function generateDatUrls(info) {
  const { server, board, threadKey } = info;
  const keyPrefix = threadKey.substring(0, 4);

  return [
    // 稼働中のスレッド
    `https://${server}.5ch.net/${board}/dat/${threadKey}.dat`,
    // DAT落ちした現役サーバのスレッド
    `https://${server}.5ch.net/${board}/oyster/${keyPrefix}/${threadKey}.dat`,
  ];
}

// 直接フェッチを試みる
async function tryDirectFetch(datUrl) {
  const response = await fetch(datUrl, {
    headers: {
      'User-Agent': 'Monazilla/1.00',
    },
  });
  return response;
}

// allorigins.win プロキシ経由でフェッチを試みる
async function tryAllOriginsFetch(datUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(datUrl)}`;
  const response = await fetch(proxyUrl);
  return response;
}

// corsproxy.io 経由でフェッチを試みる
async function tryCorsProxyFetch(datUrl) {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(datUrl)}`;
  const response = await fetch(proxyUrl);
  return response;
}

// 5ch.sc（ミラーサイト）経由でフェッチを試みる
async function try5chScFetch(datUrl) {
  // 5ch.net → 5ch.sc に変換
  const scUrl = datUrl.replace('.5ch.net/', '.5ch.sc/');
  const response = await fetch(scUrl, {
    headers: {
      'User-Agent': 'Monazilla/1.00',
    },
  });
  return response;
}

// HTMLからレスを抽出してDAT形式に変換
function parseHtmlToData(html) {
  const lines = [];

  // スレッドタイトルを抽出
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let threadTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*5ちゃんねる掲示板/, '').trim() : 'スレッドタイトル';

  // 各レスを抽出
  // 5chのHTMLは <div class="post"> や <dl class="thread"> など複数のフォーマットがある
  // 新形式: <article class="post" ...>
  const postRegex = /<(?:article|div)[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<\/(?:article|div)>/gi;
  const posts = html.match(postRegex) || [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // レス番号
    const numMatch = post.match(/data-id="(\d+)"|class="[^"]*number[^"]*"[^>]*>(\d+)/i);
    const resNum = numMatch ? (numMatch[1] || numMatch[2]) : String(i + 1);

    // 名前を抽出
    const nameMatch = post.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    let name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '名無しさん';

    // 日付・IDを抽出
    const dateMatch = post.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    let dateAndId = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // 本文を抽出
    const messageMatch = post.match(/<(?:div|span)[^>]*class="[^"]*(?:message|content|body)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/i);
    let body = messageMatch ? messageMatch[1].trim() : '';

    if (body && dateAndId) {
      // DAT形式: 名前<>メール<>日付 ID:xxx<>本文<>スレタイ（1レス目のみ）
      const line = `${name}<><>${dateAndId}<>${body}${i === 0 ? '<>' + threadTitle : ''}`;
      lines.push(line);
    }
  }

  // レスがない場合は旧形式のHTMLをパース
  if (lines.length === 0) {
    // dd/dtベースの古い形式
    const ddRegex = /<dt[^>]*>(\d+)[^<]*<[^>]+>([^<]*)<\/[^>]+>[^<]*<\/[^>]+>[^<]*([^<]*)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let match;
    let idx = 0;
    while ((match = ddRegex.exec(html)) !== null) {
      const resNum = match[1];
      const name = match[2].replace(/<[^>]+>/g, '').trim() || '名無しさん';
      const dateAndId = match[3].trim();
      const body = match[4].trim();

      const line = `${name}<><>${dateAndId}<>${body}${idx === 0 ? '<>' + threadTitle : ''}`;
      lines.push(line);
      idx++;
    }
  }

  return lines.join('\n');
}

// HTML経由でスレッドを取得
async function tryHtmlFetch(threadInfo) {
  const { server, board, threadKey } = threadInfo;
  const htmlUrl = `https://${server}.5ch.net/test/read.cgi/${board}/${threadKey}/`;

  const response = await fetch(htmlUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
    },
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // 文字コードを検出して変換
    const detectedEncoding = Encoding.detect(uint8Array);
    let html;
    if (detectedEncoding === 'SJIS' || detectedEncoding === 'EUCJP') {
      const unicodeArray = Encoding.convert(uint8Array, {
        to: 'UNICODE',
        from: detectedEncoding,
      });
      html = Encoding.codeToString(unicodeArray);
    } else {
      html = new TextDecoder('utf-8').decode(uint8Array);
    }

    // HTMLからDAT形式に変換
    const datContent = parseHtmlToData(html);
    if (datContent) {
      return {
        ok: true,
        content: datContent,
        method: 'html-scraping',
        url: htmlUrl,
      };
    }
  }

  return { ok: false, status: response.status };
}

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URL is required' }),
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

  const datUrls = generateDatUrls(threadInfo);
  let lastError = null;
  let lastStatus = 0;

  // 各URLパターンを順番に試す
  for (const datUrl of datUrls) {
    // 複数のフェッチ方法を順番に試す
    const fetchMethods = [
      { name: 'direct', fn: () => tryDirectFetch(datUrl) },
      { name: '5ch.sc', fn: () => try5chScFetch(datUrl) },
      { name: 'allorigins', fn: () => tryAllOriginsFetch(datUrl) },
      { name: 'corsproxy', fn: () => tryCorsProxyFetch(datUrl) },
    ];

    for (const method of fetchMethods) {
      try {
        const response = await method.fn();
        lastStatus = response.status;

        if (response.ok) {
          // バイナリデータとして取得
          const buffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);

          // 文字コードを検出してUTF-8に変換
          const detectedEncoding = Encoding.detect(uint8Array);

          let content;
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
              fetchMethod: method.name,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        lastError = `Failed via ${method.name}: ${datUrl} (status: ${response.status})`;
      } catch (error) {
        lastError = `Error via ${method.name}: ${error.message || 'Unknown error'}`;
      }
    }
  }

  // DAT方式がすべて失敗した場合、HTMLスクレイピングを試みる
  try {
    const htmlResult = await tryHtmlFetch(threadInfo);
    if (htmlResult.ok && htmlResult.content) {
      return new Response(
        JSON.stringify({
          content: htmlResult.content,
          threadInfo,
          datUrl: htmlResult.url,
          fetchMethod: htmlResult.method,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    lastStatus = htmlResult.status || lastStatus;
    lastError = `HTML scraping also failed (status: ${htmlResult.status})`;
  } catch (error) {
    lastError = `HTML scraping error: ${error.message || 'Unknown error'}`;
  }

  // すべてのURLパターン・フェッチ方法で失敗した場合のエラーメッセージ
  let errorMessage = 'DATファイルの取得に失敗しました。';
  if (lastStatus === 403) {
    errorMessage = '5chへのアクセスが制限されています。しばらく時間をおいてから再度お試しください。';
  } else if (lastStatus === 404) {
    errorMessage = 'スレッドが見つかりません。DAT落ちしているか、URLが正しくない可能性があります。';
  }

  return new Response(
    JSON.stringify({
      error: errorMessage,
      details: lastError,
      triedUrls: datUrls,
    }),
    {
      status: lastStatus || 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
