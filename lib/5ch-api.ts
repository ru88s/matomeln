import { Talk, Comment } from './types';

// 5ch URLから情報を抽出
export interface FiveChThreadInfo {
  server: string;      // nova, eagle など
  board: string;       // livegalileo など
  threadKey: string;   // スレッドキー（数字）
}

// 5ch URLのパターン
// https://nova.5ch.net/test/read.cgi/livegalileo/1764043617/
// https://nova.5ch.net/test/read.cgi/livegalileo/1764043617/l50
// https://itest.5ch.net/hayabusa9/test/read.cgi/news/1764539868 (モバイル版)
export function parse5chUrl(url: string): FiveChThreadInfo | null {
  // まずURLを正規化（モバイル版をPC版に変換）
  const normalizedUrl = normalize5chUrl(url);

  const patterns = [
    // 標準形式: https://server.5ch.net/test/read.cgi/board/threadkey/
    // 末尾の/はあってもなくてもOK
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

// 5ch URLを正規化（モバイル版をPC版に変換）
// itest.5ch.net/hayabusa9/test/read.cgi/news/xxx → hayabusa9.5ch.net/test/read.cgi/news/xxx
export function normalize5chUrl(url: string): string {
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

// HTMLエンティティをデコード
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // 数値文字参照（10進数）
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // 数値文字参照（16進数）
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// スレタイから不要な末尾を除去
function cleanThreadTitle(title: string): string {
  // まずHTMLエンティティをデコード
  const decoded = decodeHtmlEntities(title);
  return decoded
    // [数字のみ] - ワッチョイ等のID
    .replace(/\s*\[\d+\]\s*$/, '')
    // [無断転載禁止] 等のテキスト
    .replace(/\s*\[無断転載禁止\]\s*/g, '')
    .replace(/\s*\[転載禁止\]\s*/g, '')
    // [記者名★] - 記者キャップ（★や☆を含む）
    .replace(/\s*\[[^\]]*[★☆][^\]]*\]\s*/g, '')
    // ©2ch.net, ©bbspink.com 等の著作権表記
    .replace(/\s*©[a-z0-9.]+\s*/gi, '')
    // 末尾の余分な空白
    .trim();
}

// 5chのDATファイルをパースしてComment[]に変換
export function parseDatFile(
  datContent: string,
  threadInfo: FiveChThreadInfo
): { talk: Talk; comments: Comment[] } {
  const lines = datContent.split('\n').filter(line => line.trim());
  const comments: Comment[] = [];
  let threadTitle = '';

  lines.forEach((line, index) => {
    // DATフォーマット: 名前<>メール<>日付 ID:xxx<>本文<>スレタイ（1レス目のみ）
    const parts = line.split('<>');
    if (parts.length < 4) return;

    const name = parts[0] || '名無しさん';
    const mail = parts[1] || '';
    const dateAndId = parts[2] || '';
    const body = parts[3] || '';

    // 1レス目のみスレタイがある
    if (index === 0 && parts[4]) {
      threadTitle = cleanThreadTitle(parts[4].trim());
    }

    // 日付とIDをパース
    // 例: "2024/10/05(土) 14:23:45.67 ID:abcd1234"
    const dateIdMatch = dateAndId.match(/^(.+?)(?:\s+ID:(\S+))?$/);
    const dateStr = dateIdMatch?.[1]?.trim() || dateAndId;
    const nameId = dateIdMatch?.[2] || undefined;

    // 日付文字列をISO形式に変換
    const createdAt = parseDateString(dateStr);

    const comment: Comment = {
      id: `5ch-${threadInfo.threadKey}-${index + 1}`,
      res_id: String(index + 1),
      name: name.replace(/<[^>]+>/g, ''), // HTMLタグを除去
      name_id: nameId,
      body: convertBodyFromDat(body),
      talk_id: threadInfo.threadKey,
      created_at: createdAt,
      images: extractImagesFromBody(body),
    };

    comments.push(comment);
  });

  // Talk情報を作成
  const talk: Talk = {
    id: `5ch-${threadInfo.threadKey}`,
    title: threadTitle || `${threadInfo.board}スレッド`,
    body: '',
    created_at: comments[0]?.created_at || new Date().toISOString(),
    updated_at: comments[comments.length - 1]?.created_at || new Date().toISOString(),
    views_count: 0,
    sage_count: 0,
    hash_id: threadInfo.threadKey,
    comment_count: comments.length,
    show_id: true,
  };

  return { talk, comments };
}

// 5chの日付文字列をISO形式に変換
function parseDateString(dateStr: string): string {
  // "2024/10/05(土) 14:23:45.67" → ISO形式
  // "24/10/05(土) 14:23:45.67" → ISO形式（2桁年）
  const match = dateStr.match(/(\d{2,4})\/(\d{1,2})\/(\d{1,2})\([^)]+\)\s*(\d{1,2}):(\d{2}):(\d{2})/);

  if (match) {
    let year = parseInt(match[1]);
    // 2桁年の場合は2000年代として扱う
    if (year < 100) {
      year += 2000;
    }
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const hour = match[4].padStart(2, '0');
    const minute = match[5];
    const second = match[6];

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  }

  return new Date().toISOString();
}

// DAT形式の本文をHTMLから通常テキストに変換
function convertBodyFromDat(body: string): string {
  let result = body
    // <br>を改行に
    .replace(/<br\s*\/?>/gi, '\n')
    // &gt;をアンカー用に戻す
    .replace(/&gt;&gt;(\d+)/g, '>>$1')
    // その他のHTMLエンティティ
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // HTMLタグを除去（リンクなど）
    .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    // 5chアイコン指定（sssp://）を含む行を除去
    .split('\n')
    .filter(line => !line.trim().startsWith('sssp://'))
    .join('\n')
    .trim();

  // ニュース記事本文の整形
  result = formatNewsBody(result);

  return result;
}

// ニュース記事本文を読みやすく整形
function formatNewsBody(body: string): string {
  return body
    // 全角スペースを半角スペースに統一
    .replace(/　/g, ' ')
    // 行頭の連続するスペースを1つに
    .replace(/^[ ]+/gm, ' ')
    // 行末のスペースを削除
    .replace(/[ ]+$/gm, '')
    // 連続する空行を1つに
    .replace(/\n{3,}/g, '\n\n')
    // 「。」の後の改行がない場合は改行を追加（文章の区切りを明確に）
    .replace(/。([^\n」』）】\)"])/g, '。\n$1')
    // 連続するスペースを1つに
    .replace(/  +/g, ' ')
    .trim();
}

// 本文から画像URLを抽出
function extractImagesFromBody(body: string): string[] {
  const images: string[] = [];
  // 画像URLパターン（jpg, jpeg, png, gif, webp）
  const imgRegex = /https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<>"]*)?/gi;
  const matches = body.match(imgRegex);
  if (matches) {
    images.push(...matches);
  }
  return images;
}

// URLがどのサービスか判定
export type SourceType = 'shikutoku' | '5ch' | 'open2ch' | '2chsc' | 'unknown';

export function detectSourceType(url: string): SourceType {
  if (/shikutoku\.me/i.test(url) || /^\d+$/.test(url.trim())) {
    return 'shikutoku';
  }
  if (/\.5ch\.net/i.test(url)) {
    return '5ch';
  }
  if (/\.2ch\.sc/i.test(url)) {
    return '2chsc';
  }
  if (/open2ch\.net/i.test(url)) {
    return 'open2ch';
  }
  return 'unknown';
}

// 2ch.sc URLから情報を抽出
export interface TwoChScThreadInfo {
  server: string;      // ai, hayabusa9 など
  board: string;       // newsplus など
  threadKey: string;   // スレッドキー（数字）
}

// 2ch.sc URLのパターン
// https://ai.2ch.sc/test/read.cgi/newsplus/1733123456/
// https://ai.2ch.sc/test/read.cgi/newsplus/1733123456 (末尾/なし)
export function parse2chscUrl(url: string): TwoChScThreadInfo | null {
  const patterns = [
    // 標準形式: https://server.2ch.sc/test/read.cgi/board/threadkey/
    // 末尾の/はあってもなくてもOK
    /https?:\/\/([a-z0-9]+)\.2ch\.sc\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)\/?/i,
    // DAT直接: https://server.2ch.sc/board/dat/threadkey.dat
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

// 2ch.scのDATファイルをパースしてComment[]に変換（5chと同じ形式）
export function parse2chscDatFile(
  datContent: string,
  threadInfo: TwoChScThreadInfo
): { talk: Talk; comments: Comment[] } {
  const lines = datContent.split('\n').filter(line => line.trim());
  const comments: Comment[] = [];
  let threadTitle = '';

  lines.forEach((line, index) => {
    // DATフォーマット: 名前<>メール<>日付 ID:xxx<>本文<>スレタイ（1レス目のみ）
    const parts = line.split('<>');
    if (parts.length < 4) return;

    const name = parts[0] || '名無しさん';
    const dateAndId = parts[2] || '';
    const body = parts[3] || '';

    // 1レス目のみスレタイがある
    if (index === 0 && parts[4]) {
      threadTitle = cleanThreadTitle(parts[4].trim());
    }

    // 日付とIDをパース
    const dateIdMatch = dateAndId.match(/^(.+?)(?:\s+ID:(\S+))?$/);
    const dateStr = dateIdMatch?.[1]?.trim() || dateAndId;
    const nameId = dateIdMatch?.[2] || undefined;

    // 日付文字列をISO形式に変換
    const createdAt = parseDateString(dateStr);

    const comment: Comment = {
      id: `2chsc-${threadInfo.threadKey}-${index + 1}`,
      res_id: String(index + 1),
      name: name.replace(/<[^>]+>/g, ''), // HTMLタグを除去
      name_id: nameId,
      body: convertBodyFromDat(body),
      talk_id: threadInfo.threadKey,
      created_at: createdAt,
      images: extractImagesFromBody(body),
    };

    comments.push(comment);
  });

  // Talk情報を作成
  const talk: Talk = {
    id: `2chsc-${threadInfo.threadKey}`,
    title: threadTitle || `${threadInfo.board}スレッド`,
    body: '',
    created_at: comments[0]?.created_at || new Date().toISOString(),
    updated_at: comments[comments.length - 1]?.created_at || new Date().toISOString(),
    views_count: 0,
    sage_count: 0,
    hash_id: threadInfo.threadKey,
    comment_count: comments.length,
    show_id: true,
  };

  return { talk, comments };
}

// open2ch URLから情報を抽出
export interface Open2chThreadInfo {
  board: string;       // livejupiter など
  threadKey: string;   // スレッドキー（数字）
}

// open2ch URLのパターン
// https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890/
// https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890 (末尾/なし)
// https://open2ch.net/test/read.cgi/livejupiter/1732936890/
export function parseOpen2chUrl(url: string): Open2chThreadInfo | null {
  const patterns = [
    // サブドメイン付き: https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890/
    // 末尾の/はあってもなくてもOK
    /https?:\/\/([a-z0-9]+\.)?open2ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)\/?/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        board: match[2],
        threadKey: match[3],
      };
    }
  }

  return null;
}

// open2chのDATファイルをパースしてComment[]に変換
export function parseOpen2chDatFile(
  datContent: string,
  threadInfo: Open2chThreadInfo
): { talk: Talk; comments: Comment[] } {
  const lines = datContent.split('\n').filter(line => line.trim());
  const comments: Comment[] = [];
  let threadTitle = '';

  lines.forEach((line, index) => {
    // DATフォーマット: 名前<>メール<>日付 ID:xxx<>本文<>スレタイ（1レス目のみ）
    const parts = line.split('<>');
    if (parts.length < 4) return;

    const name = parts[0] || '名無しさん';
    const dateAndId = parts[2] || '';
    const body = parts[3] || '';

    // 1レス目のみスレタイがある
    if (index === 0 && parts[4]) {
      threadTitle = cleanThreadTitle(parts[4].trim());
    }

    // 日付とIDをパース
    // 例: "2024/10/05(土)14:23:45 ID:abcd"
    const dateIdMatch = dateAndId.match(/^(.+?)(?:\s*ID:(\S+))?$/);
    const dateStr = dateIdMatch?.[1]?.trim() || dateAndId;
    const nameId = dateIdMatch?.[2] || undefined;

    // 日付文字列をISO形式に変換
    const createdAt = parseOpen2chDateString(dateStr);

    const comment: Comment = {
      id: `open2ch-${threadInfo.threadKey}-${index + 1}`,
      res_id: String(index + 1),
      name: name.replace(/<[^>]+>/g, ''), // HTMLタグを除去
      name_id: nameId,
      body: convertBodyFromDat(body),
      talk_id: threadInfo.threadKey,
      created_at: createdAt,
      images: extractImagesFromBody(body),
    };

    comments.push(comment);
  });

  // Talk情報を作成
  const talk: Talk = {
    id: `open2ch-${threadInfo.threadKey}`,
    title: threadTitle || `${threadInfo.board}スレッド`,
    body: '',
    created_at: comments[0]?.created_at || new Date().toISOString(),
    updated_at: comments[comments.length - 1]?.created_at || new Date().toISOString(),
    views_count: 0,
    sage_count: 0,
    hash_id: threadInfo.threadKey,
    comment_count: comments.length,
    show_id: true,
  };

  return { talk, comments };
}

// open2chの日付文字列をISO形式に変換
function parseOpen2chDateString(dateStr: string): string {
  // "2024/10/05(土)14:23:45" → ISO形式
  // open2chは曜日と時刻の間にスペースがない場合がある
  const match = dateStr.match(/(\d{2,4})\/(\d{1,2})\/(\d{1,2})\([^)]+\)\s*(\d{1,2}):(\d{2}):(\d{2})/);

  if (match) {
    let year = parseInt(match[1]);
    if (year < 100) {
      year += 2000;
    }
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const hour = match[4].padStart(2, '0');
    const minute = match[5];
    const second = match[6];

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  }

  return new Date().toISOString();
}

// 5chスレッドデータを取得（Deno Deploy経由）
const DENO_5CH_API = 'https://polite-squirrel-51.deno.dev';

export async function fetch5chThread(url: string): Promise<{ talk: Talk; comments: Comment[] } | null> {
  // URLを正規化（モバイル版をPC版に変換）
  const normalizedUrl = normalize5chUrl(url);

  const threadInfo = parse5chUrl(normalizedUrl);
  if (!threadInfo) {
    throw new Error('無効な5ch URLです');
  }

  try {
    // Deno Deploy APIを使用（Cloudflare Workersは5chにブロックされているため）
    // 正規化されたURLを使用
    const response = await fetch(`${DENO_5CH_API}/get5chDat?url=${encodeURIComponent(normalizedUrl)}`);

    if (!response.ok) {
      // Deno Deployが失敗した場合、Cloudflare Functions経由で2ch.scにフォールバック
      console.log('5ch.net failed, trying 2ch.sc fallback via Cloudflare...');
      return await fetch5chFrom2chsc(normalizedUrl, threadInfo);
    }

    const data = await response.json();
    return parseDatFile(data.content, threadInfo);
  } catch (error) {
    // ネットワークエラーなどの場合も2ch.scにフォールバック
    console.log('5ch.net error, trying 2ch.sc fallback:', error);
    try {
      return await fetch5chFrom2chsc(normalizedUrl, threadInfo);
    } catch (fallbackError) {
      console.error('2ch.sc fallback also failed:', fallbackError);
      throw error; // 元のエラーを投げる
    }
  }
}

// 5ch URLを使って2ch.scからDATを取得（フォールバック用）
async function fetch5chFrom2chsc(url: string, threadInfo: FiveChThreadInfo): Promise<{ talk: Talk; comments: Comment[] }> {
  const response = await fetch(`/api/proxy/get5chFallback?url=${encodeURIComponent(url)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error('サーバーからのアクセスが制限されています。しばらく時間をおいてから再度お試しください。');
    }
    if (response.status === 404) {
      throw new Error('スレッドが見つかりませんでした。URLが正しいか、またはスレッドが削除されていないか確認してください。');
    }
    throw new Error(error.error || 'スレッドの取得に失敗しました');
  }

  const data = await response.json();
  return parseDatFile(data.content, threadInfo);
}

// open2chスレッドデータを取得
export async function fetchOpen2chThread(url: string): Promise<{ talk: Talk; comments: Comment[] } | null> {
  const threadInfo = parseOpen2chUrl(url);
  if (!threadInfo) {
    throw new Error('無効なopen2ch URLです');
  }

  try {
    // open2chはプロキシAPI経由でDATを取得
    const response = await fetch(`/api/proxy/getOpen2chDat?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'スレッドの取得に失敗しました');
    }

    const data = await response.json();
    return parseOpen2chDatFile(data.content, threadInfo);
  } catch (error) {
    console.error('Error fetching open2ch thread:', error);
    throw error;
  }
}

// 2ch.scスレッドデータを取得
export async function fetch2chscThread(url: string): Promise<{ talk: Talk; comments: Comment[] } | null> {
  const threadInfo = parse2chscUrl(url);
  if (!threadInfo) {
    throw new Error('無効な2ch.sc URLです');
  }

  try {
    // 2ch.scはプロキシAPI経由でDATを取得
    const response = await fetch(`/api/proxy/get2chscDat?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'スレッドの取得に失敗しました');
    }

    const data = await response.json();
    return parse2chscDatFile(data.content, threadInfo);
  } catch (error) {
    console.error('Error fetching 2ch.sc thread:', error);
    throw error;
  }
}
