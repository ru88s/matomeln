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
    // 数値文字参照をデコード（10進数: &#65374; → ～）
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // 数値文字参照をデコード（16進数: &#xFF5E; → ～）
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
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
    // 行頭のスペースを完全に削除
    .replace(/^[ ]+/gm, '')
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
export type SourceType = 'shikutoku' | '5ch' | 'open2ch' | '2chsc' | 'girlschannel' | 'unknown';

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
  if (/girlschannel\.net/i.test(url)) {
    return 'girlschannel';
  }
  return 'unknown';
}

// ガールズちゃんねる URLから情報を抽出
export interface GirlsChannelThreadInfo {
  topicId: string;   // トピックID（数字）
}

// ガールズちゃんねる URLのパターン
// https://girlschannel.net/topics/5978590/
// https://girlschannel.net/topics/5978590
export function parseGirlsChannelUrl(url: string): GirlsChannelThreadInfo | null {
  const pattern = /https?:\/\/girlschannel\.net\/topics\/(\d+)\/?/i;
  const match = url.match(pattern);

  if (match) {
    return {
      topicId: match[1],
    };
  }

  return null;
}

// ネストしたdivを考慮してdiv要素を除去し、コールバックで変換する
function replaceNestedDivs(
  html: string,
  classPattern: RegExp,
  replacer: (fullMatch: string, content: string) => string
): string {
  let result = html;
  let startMatch;
  const startRegex = new RegExp(`<div[^>]*class="[^"]*(?:${classPattern.source})[^"]*"[^>]*>`, 'gi');

  while ((startMatch = startRegex.exec(result)) !== null) {
    const startIndex = startMatch.index;
    const contentStart = startIndex + startMatch[0].length;

    // ネストしたdivを追跡して終了位置を探す
    let depth = 1;
    let endIndex = contentStart;
    const remaining = result.slice(contentStart);
    const tagRegex = /<\/?div[^>]*>/gi;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(remaining)) !== null) {
      if (tagMatch[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = contentStart + tagMatch.index;
          break;
        }
      } else if (!tagMatch[0].endsWith('/>')) {
        depth++;
      }
    }

    const fullMatch = result.slice(startIndex, endIndex + 6); // +6 for </div>
    const content = result.slice(contentStart, endIndex);
    const replacement = replacer(fullMatch, content);

    result = result.slice(0, startIndex) + replacement + result.slice(endIndex + 6);
    // 正規表現のlastIndexをリセット
    startRegex.lastIndex = startIndex + replacement.length;
  }

  return result;
}

// ガールズちゃんねるのHTMLをパースしてComment[]に変換
export function parseGirlsChannelHtml(
  htmlContent: string,
  threadInfo: GirlsChannelThreadInfo
): { talk: Talk; comments: Comment[] } {
  const comments: Comment[] = [];

  // タイトルを抽出
  const titleMatch = htmlContent.match(/<h1[^>]*>\s*(?:<!--[^>]*-->)?\s*([^<]+)/);
  const threadTitle = titleMatch ? titleMatch[1].trim() : 'ガールズちゃんねるトピック';

  // コメントを抽出
  // <li class="comment-item" id="comment1"> ... </li>
  const commentRegex = /<li\s+class="comment-item"\s+id="comment(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = commentRegex.exec(htmlContent)) !== null) {
    const commentNum = match[1];
    const commentHtml = match[2];

    // 日時を抽出: <a href="/comment/xxx/1/" rel="nofollow">2025/12/29(月) 17:19:34</a>
    const dateMatch = commentHtml.match(/<a[^>]*rel="nofollow"[^>]*>(\d{4}\/\d{1,2}\/\d{1,2}\([^)]+\)\s*\d{1,2}:\d{2}:\d{2})<\/a>/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    // 本文を抽出: <div class="body ...">本文</div>
    // ネストされたdivに対応するため、body divの開始位置を見つけてからネストを考慮して終了位置を探す
    let body = '';
    const bodyStartMatch = commentHtml.match(/<div\s+class="body[^"]*"[^>]*>/);
    if (bodyStartMatch && bodyStartMatch.index !== undefined) {
      const startIndex = bodyStartMatch.index + bodyStartMatch[0].length;
      let depth = 1;
      let endIndex = startIndex;
      const remaining = commentHtml.slice(startIndex);

      // ネストされたdivを追跡しながら終了位置を探す
      const tagRegex = /<\/?div[^>]*>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(remaining)) !== null) {
        if (tagMatch[0].startsWith('</')) {
          depth--;
          if (depth === 0) {
            endIndex = startIndex + tagMatch.index;
            break;
          }
        } else if (!tagMatch[0].endsWith('/>')) {
          depth++;
        }
      }

      body = commentHtml.slice(startIndex, endIndex);
    }

    // まずリンクカードを除去（画像抽出前に行う）
    const linkCardPattern = /link-card|ogp-card|embed-card|card-box|article-card|article-body|body-link|link-box|card-link/;
    let bodyForImages = replaceNestedDivs(body, linkCardPattern, () => '');
    // blockquote内のリンクカードも除去
    bodyForImages = bodyForImages.replace(/<blockquote[^>]*class="[^"]*link[^"]*"[^>]*>[\s\S]*?<\/blockquote>/gi, '');
    // 外部リンク（aタグ）に包まれた画像を除去（OGPプレビュー画像）
    bodyForImages = bodyForImages.replace(/<a[^>]*href="https?:\/\/(?!girlschannel\.net|instagram\.com|cdninstagram\.com)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

    // 画像URLを<img>タグから抽出（リンクカード除去後のbodyから）
    const images: string[] = [];
    const seenImageBases = new Set<string>();

    // 画像URLのベース部分を取得（クエリパラメータとサイズ指定を除去して重複判定）
    const getImageBase = (url: string): string => {
      // クエリパラメータを除去
      let base = url.split('?')[0];

      // Instagram画像の場合、画像IDを抽出（例: 123456789_123456789_123456789_n.jpg）
      if (url.includes('cdninstagram.com') || url.includes('scontent')) {
        // Instagram URLから数字のID部分を抽出
        const instagramMatch = base.match(/(\d{10,}_\d+_\d+)_n\.(jpg|jpeg|png|webp)/i);
        if (instagramMatch) {
          return instagramMatch[1].toLowerCase();
        }
        // 別のパターン: 数字だけのファイル名
        const numericMatch = base.match(/\/(\d{10,})[_.].*\.(jpg|jpeg|png|webp)/i);
        if (numericMatch) {
          return numericMatch[1];
        }
      }

      // よくあるサイズ指定パターンを除去（例: _200x200, -thumb, /s200/ など）
      base = base.replace(/[_-]\d+x\d+/g, '');
      base = base.replace(/\/s\d+x\d+\//g, '/');
      base = base.replace(/\/s\d+\//g, '/');
      base = base.replace(/[_-]thumb/gi, '');
      // ファイル名だけを取得（パスの違いを吸収）
      const filename = base.split('/').pop() || base;
      return filename.toLowerCase();
    };

    // 許可する画像CDNのリスト（Instagram, girlschannel自体の画像）
    const allowedImageDomains = [
      'cdninstagram.com',
      'instagram.com',
      'scontent',  // Instagram CDN
      'girlschannel.net',
      'gc-img.', // Girls Channel images
    ];

    // 画像URLを追加（重複チェック付き）
    const addImage = (url: string): void => {
      // OGP用の小さいサムネイルは除外
      if (url.includes('/card/') || url.includes('/ogp/') || url.includes('_ogp')) {
        return;
      }

      // 許可されたドメインからの画像のみ抽出
      const isAllowed = allowedImageDomains.some(domain => url.includes(domain));
      if (!isAllowed) {
        return;
      }

      const base = getImageBase(url);
      if (!seenImageBases.has(base)) {
        seenImageBases.add(base);
        images.push(url);
      }
    };

    // data-src属性から画像URLを抽出（lazyload用）- リンクカード除去後
    const dataSrcRegex = /data-src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/gi;
    let imgMatch;
    while ((imgMatch = dataSrcRegex.exec(bodyForImages)) !== null) {
      addImage(imgMatch[1]);
    }
    // src属性からも抽出
    const srcRegex = /<img[^>]+src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/gi;
    while ((imgMatch = srcRegex.exec(bodyForImages)) !== null) {
      addImage(imgMatch[1]);
    }

    // HTMLを整形 - リンクカードからURLを抽出（ネストしたdiv対応）
    body = replaceNestedDivs(body, linkCardPattern, (fullMatch, content) => {
      // リンクカード内のaタグからhrefを抽出
      const hrefMatch = content.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
      if (hrefMatch) {
        return '\n' + hrefMatch[1] + '\n';
      }
      return '';
    });

    // blockquote内のリンクカードからもURLを抽出
    body = body.replace(/<blockquote[^>]*class="[^"]*link[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
      const hrefMatch = content.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
      if (hrefMatch) {
        return '\n' + hrefMatch[1] + '\n';
      }
      return '';
    });

    body = body
      // <!-- logly_body_begin --> などのコメントを除去
      .replace(/<!--[^>]*-->/g, '')
      // <br>を改行に
      .replace(/<br\s*\/?>/gi, '\n')
      // 画像タグを除去（imagesに既に抽出済み）
      .replace(/<img[^>]+>/gi, '')
      // リンクタグからテキストのみ抽出（URLは除去）
      .replace(/<a[^>]+href="[^"]*"[^>]*>([^<]*)<\/a>/gi, '$1')
      // その他のHTMLタグを除去
      .replace(/<[^>]+>/g, '')
      // 画像URLをテキストから除去
      .replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?/gi, '')
      // HTMLエンティティをデコード
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#0?39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // 数値文字参照をデコード（10進数: &#65374; → ～）
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      // 数値文字参照をデコード（16進数: &#xFF5E; → ～）
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // 「出典：」行を除去（リンクカードの残骸）
      .replace(/出典[：:]\s*[^\n]+/g, '')
      // 各行の先頭の空白を除去し、重複行を除去
      .split('\n')
      .map(line => line.trim())
      .filter((line, index, arr) => {
        // 空行は保持（ただし連続は後で処理）
        if (line === '') return true;
        // 同じ内容の行が直前にあれば除去（重複除去）
        if (index > 0 && arr[index - 1] === line) return false;
        // 短い行（10文字以上）が長い行に含まれている場合は除去
        if (line.length >= 10) {
          for (let i = 0; i < arr.length; i++) {
            if (i !== index && arr[i].length > line.length && arr[i].includes(line)) {
              return false;
            }
          }
        }
        return true;
      })
      .join('\n')
      // 連続した空行を1つに
      .replace(/\n{3,}/g, '\n\n')
      // 連続した空白を1つに
      .replace(/[ 　]{2,}/g, ' ')
      .trim();

    // 日付をパース
    const createdAt = parseGirlsChannelDate(dateStr);

    const comment: Comment = {
      id: `gc-${threadInfo.topicId}-${commentNum}`,
      res_id: commentNum,
      name: '匿名',
      name_id: undefined,
      body: body,
      talk_id: threadInfo.topicId,
      created_at: createdAt,
      images: images,
    };

    comments.push(comment);
  }

  // Talk情報を作成
  const talk: Talk = {
    id: `gc-${threadInfo.topicId}`,
    title: threadTitle,
    body: '',
    created_at: comments[0]?.created_at || new Date().toISOString(),
    updated_at: comments[comments.length - 1]?.created_at || new Date().toISOString(),
    views_count: 0,
    sage_count: 0,
    hash_id: threadInfo.topicId,
    comment_count: comments.length,
    show_id: false, // ガルちゃんはID表示なし
  };

  return { talk, comments };
}

// ガールズちゃんねるの日付文字列をISO形式に変換
function parseGirlsChannelDate(dateStr: string): string {
  // "2025/12/29(月) 17:19:34" → ISO形式
  const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\([^)]+\)\s*(\d{1,2}):(\d{2}):(\d{2})/);

  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const hour = match[4].padStart(2, '0');
    const minute = match[5];
    const second = match[6];

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  }

  return new Date().toISOString();
}

// ガールズちゃんねるスレッドデータを取得
export async function fetchGirlsChannelThread(url: string): Promise<{ talk: Talk; comments: Comment[] } | null> {
  const threadInfo = parseGirlsChannelUrl(url);
  if (!threadInfo) {
    throw new Error('無効なガールズちゃんねるURLです');
  }

  try {
    const response = await fetch(`/api/proxy/getGirlsChannel?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'トピックの取得に失敗しました');
    }

    const data = await response.json();
    return parseGirlsChannelHtml(data.content, threadInfo);
  } catch (error) {
    console.error('Error fetching GirlsChannel thread:', error);
    throw error;
  }
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

    // 文字化けチェック（置換文字や異常な文字パターンを検出）
    const content = data.content || '';
    const replacementCharCount = (content.match(/\uFFFD/g) || []).length;
    const totalChars = content.length;
    // 置換文字が1%以上、または100個以上ある場合は文字化けとみなす
    if (totalChars > 0 && (replacementCharCount > 100 || replacementCharCount / totalChars > 0.01)) {
      console.log(`Detected mojibake (${replacementCharCount} replacement chars), trying 2ch.sc fallback...`);
      return await fetch5chFrom2chsc(normalizedUrl, threadInfo);
    }

    return parseDatFile(content, threadInfo);
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
