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
export function parse5chUrl(url: string): FiveChThreadInfo | null {
  const patterns = [
    // 標準形式: https://server.5ch.net/test/read.cgi/board/threadkey/
    /https?:\/\/([a-z0-9]+)\.5ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i,
    // DAT直接: https://server.5ch.net/board/dat/threadkey.dat
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
      threadTitle = parts[4].trim();
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
  return body
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
export type SourceType = 'shikutoku' | '5ch' | 'open2ch' | 'unknown';

export function detectSourceType(url: string): SourceType {
  if (/shikutoku\.me/i.test(url) || /^\d+$/.test(url.trim())) {
    return 'shikutoku';
  }
  if (/\.5ch\.net/i.test(url)) {
    return '5ch';
  }
  if (/open2ch\.net/i.test(url)) {
    return 'open2ch';
  }
  return 'unknown';
}

// open2ch URLから情報を抽出
export interface Open2chThreadInfo {
  board: string;       // livejupiter など
  threadKey: string;   // スレッドキー（数字）
}

// open2ch URLのパターン
// https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890/
// https://open2ch.net/test/read.cgi/livejupiter/1732936890/
export function parseOpen2chUrl(url: string): Open2chThreadInfo | null {
  const patterns = [
    // サブドメイン付き: https://hayabusa.open2ch.net/test/read.cgi/livejupiter/1732936890/
    /https?:\/\/([a-z0-9]+\.)?open2ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i,
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
      threadTitle = parts[4].trim();
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
  const threadInfo = parse5chUrl(url);
  if (!threadInfo) {
    throw new Error('無効な5ch URLです');
  }

  try {
    // Deno Deploy APIを使用（Cloudflare Workersは5chにブロックされているため）
    const response = await fetch(`${DENO_5CH_API}/get5chDat?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        throw new Error('5chサーバーからのアクセスが制限されています。しばらく時間をおいてから再度お試しください。');
      }
      throw new Error(error.error || 'スレッドの取得に失敗しました');
    }

    const data = await response.json();
    return parseDatFile(data.content, threadInfo);
  } catch (error) {
    console.error('Error fetching 5ch thread:', error);
    throw error;
  }
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
