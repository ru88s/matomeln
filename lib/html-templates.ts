import { Talk, Comment, CommentWithStyle, MatomeOptions, BlogType } from './types';
import { sanitizeThreadTitle } from './thread-title';

export interface GeneratedHTML {
  title: string;
  body: string;
  footer: string;
}

export interface SourceInfo {
  source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc' | 'girlschannel' | 'talkjp' | 'matomeBlog';
  originalUrl: string;
}

export async function generateMatomeHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions,
  sourceInfo?: SourceInfo | null,
  customName?: string,
  customNameBold?: boolean,
  customNameColor?: string,
  thumbnailUrl?: string,
  showIdInHtml?: boolean,
  isDevMode?: boolean,
  skipOgp?: boolean,
  customFooterHtml?: string,
  blogType?: BlogType
): Promise<GeneratedHTML> {
  const { includeImages, style, includeTimestamp, includeName } = options;

  let result: GeneratedHTML;
  if (style === 'rich') {
    result = await generateRichHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, skipOgp, blogType);
  } else {
    result = await generateSimpleHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, skipOgp, blogType);
  }

  // DEVモードの場合はタイトルの頭に§を追加（ストック記事とわかるように）
  result.title = sanitizeThreadTitle(result.title);

  if (isDevMode && result.title) {
    result.title = `§ ${result.title}`;
  }

  // カスタムフッターHTMLを追加
  if (customFooterHtml && customFooterHtml.trim()) {
    result.footer = result.footer + '\n' + customFooterHtml.trim();
  }

  return result;
}

// 引用元URLを生成
function getSourceUrl(talk: Talk, sourceInfo?: SourceInfo | null): string {
  if (sourceInfo?.source === '5ch' && sourceInfo.originalUrl) {
    // 5chの場合は入力されたURLを整形
    const url = sourceInfo.originalUrl.trim();
    // 末尾のスラッシュやパラメータを除去して正規化
    const match = url.match(/https?:\/\/([a-z0-9]+)\.5ch\.(?:net|io)\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i);
    if (match) {
      return `https://${match[1]}.5ch.io/test/read.cgi/${match[2]}/${match[3]}/`;
    }
    return url;
  }
  if (sourceInfo?.source === 'open2ch' && sourceInfo.originalUrl) {
    // open2chの場合は入力されたURLを整形
    const url = sourceInfo.originalUrl.trim();
    // 末尾のスラッシュやパラメータを除去して正規化
    const match = url.match(/https?:\/\/(?:([a-z0-9]+)\.)?open2ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i);
    if (match) {
      const host = match[1] ? `${match[1]}.open2ch.net` : 'open2ch.net';
      return `https://${host}/test/read.cgi/${match[2]}/${match[3]}/`;
    }
    return url;
  }
  if (sourceInfo?.source === '2chsc' && sourceInfo.originalUrl) {
    const url = sourceInfo.originalUrl.trim();
    const match = url.match(/https?:\/\/([a-z0-9-]+)\.2ch\.sc\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i);
    if (match) {
      return `https://${match[1]}.2ch.sc/test/read.cgi/${match[2]}/${match[3]}/`;
    }
    return url;
  }
  if (sourceInfo?.source === 'talkjp' && sourceInfo.originalUrl) {
    const url = sourceInfo.originalUrl.trim();
    const match = url.match(/https?:\/\/talk\.jp\/boards\/([a-z0-9_]+)\/(\d+)/i);
    if (match) {
      return `https://talk.jp/boards/${match[1]}/${match[2]}`;
    }
    return url;
  }
  if (sourceInfo?.source === 'girlschannel' && sourceInfo.originalUrl) {
    // ガールズちゃんねるの場合は入力されたURLを整形
    const url = sourceInfo.originalUrl.trim();
    // 末尾のスラッシュやパラメータを除去して正規化
    const match = url.match(/https?:\/\/girlschannel\.net\/topics\/(\d+)/i);
    if (match) {
      return `https://girlschannel.net/topics/${match[1]}/`;
    }
    return url;
  }
  if (sourceInfo?.source === 'matomeBlog' && sourceInfo.originalUrl) {
    return sourceInfo.originalUrl.trim();
  }
  // Shikutokuの場合
  return `https://shikutoku.me/talks/${talk.id}`;
}

function generateSourceLinkHTML(talk: Talk, sourceInfo?: SourceInfo | null): string {
  const sourceUrl = getSourceUrl(talk, sourceInfo);
  const safeSourceUrl = escapeHtml(sourceUrl);
  return `<p class="source_link" style="color:gray;text-align:right;">引用元:<a href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer">${safeSourceUrl}</a></p>`;
}

// コメントスタイルを適用する関数
function getCommentStyle(options: MatomeOptions): string {
  const { bold, fontSize, color } = options.commentStyle;

  let style = `color: ${color};`;

  if (bold) {
    style += ' font-weight: bold;';
  }

  switch (fontSize) {
    case 'small':
      style += ' font-size: 14px;';
      break;
    case 'medium':
      style += ' font-size: 16px;';
      break;
    case 'large':
      style += ' font-size: 18px;';
      break;
  }

  return style;
}

// サムネイル画像タグを生成
function generateThumbnailHTML(thumbnailUrl: string): string {
  return `<div align="center"><div align="center"><a href="${thumbnailUrl}" title="no title" target="_blank"><img src="${thumbnailUrl}" width="400" border="0" alt="no title" hspace="5" class="pict" /></a></div><br /></div>\n\n`;
}

function shouldUseKotoriaCompactHtml(blogType?: BlogType): boolean {
  return blogType === 'kotoria';
}

function shouldEmbedImgur(blogType?: BlogType): boolean {
  return blogType !== 'girls-matome';
}

function matomeResponseTailHtml(blogType?: BlogType): string {
  return '\n</div>\n<br />';
}

function normalizeCommentBodyLineBreaks(body: string): string {
  return body
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+|\n+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(^|\n)(>>?\d+[^\n]*)\n{2,}/g, '$1$2\n');
}

// シンプルなHTML
async function generateSimpleHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions,
  sourceInfo?: SourceInfo | null,
  customName?: string,
  customNameBold?: boolean,
  customNameColor?: string,
  thumbnailUrl?: string,
  showIdInHtml?: boolean,
  skipOgp?: boolean,
  blogType?: BlogType
): Promise<GeneratedHTML> {
  const { includeTimestamp, includeName, includeImages } = options;

  // タイトル部分
  const titleHTML = escapeHtml(sanitizeThreadTitle(talk.title));

  // コメントをHTML化する関数
  const formatComment = async (comment: CommentWithStyle) => {
    const individualColor = comment.color || '#000000';
    // 個別のコメントのサイズを適用（小:14px, 中:18px, 大:22px）
    const individualFontSize = comment.fontSize === 'small' ? '14px' : comment.fontSize === 'large' ? '22px' : '18px';
    // line-heightはfont-sizeの1.5倍
    const lineHeight = comment.fontSize === 'small' ? '21px' : comment.fontSize === 'large' ? '33px' : '27px';
    // 名前の表示 - カスタム名が設定されていればそれを使用、なければ元のコメントの名前
    const displayName = customName || comment.name || '匿名';
    const nameColor = customName ? (customNameColor || 'pink') : 'pink';
    const nameBold = customName ? (customNameBold !== false) : true;
    const nameDisplay = `<span style="font-weight: ${nameBold ? 'bold' : 'normal'}; color: ${nameColor};">${escapeHtml(displayName)}</span>`;

    const timestamp = includeTimestamp
      ? formatDateForMatome(comment.created_at)
      : '';

    // ID表示
    const idDisplay = showIdInHtml && comment.name_id
      ? `ID:${escapeHtml(comment.name_id)}`
      : '';

    // ヘッダー情報を組み立て（timestampとIDをまとめてsilver色に）
    const headerInfo = [timestamp, idDisplay].filter(Boolean).join(' ');
    const headerInfoHTML = headerInfo ? `<span style="color: silver;">${headerInfo}</span>` : '';

    // 画像の処理
    let imageHTML = '';
    if (includeImages && comment.images && comment.images.length > 0) {
      imageHTML = comment.images.filter(img => img && typeof img === 'string').map(img => {
        const imageUrl = img.startsWith('http') ? img : `https://cdn.shikutoku.me${img.startsWith('/') ? img : '/' + img}`;
        return `<div style="margin:10px 0;"><img src="${imageUrl}" style="width:100%;" /></div>`;
      }).join('');
    }

    // アンカーを含むコメントかどうか判定
    const hasAnchor = />>?\d+/.test(comment.body);
    const headerClass = hasAnchor ? 't_h t_i' : 't_h';
    const bodyClass = hasAnchor ? 't_b t_i' : 't_b';
    const indentStyle = hasAnchor ? 'margin-left:10px;' : '';

    // コメント本文のスタイル
    // options.commentStyle.boldの設定を反映
    const boldStyle = options.commentStyle.bold ? 'font-weight:bold;' : '';
    const commentStyle = `${boldStyle}font-size:${individualFontSize};line-height:${lineHeight};color:${individualColor};margin-top:10px;`;

    const formattedBody = await formatCommentBodyForMatome(comment.body, skipOgp, shouldUseKotoriaCompactHtml(blogType), shouldEmbedImgur(blogType));
    const responseTail = matomeResponseTailHtml(blogType);

    // 整形されたHTMLを生成
    if (hasAnchor) {
      return `<div class="res_div"><div style="${indentStyle}" class="${headerClass}">${comment.res_id}: ${nameDisplay} ${headerInfoHTML}</div>
<div style="${commentStyle}${indentStyle}" class="${bodyClass}">${formattedBody}</div>${imageHTML ? '\n' + imageHTML : ''}${responseTail}`;
    } else {
      return `<div class="res_div"><div class="${headerClass}">${comment.res_id}: ${nameDisplay} ${headerInfoHTML}</div>
<div style="${commentStyle}" class="${bodyClass}">${formattedBody}</div>${imageHTML ? '\n' + imageHTML : ''}${responseTail}`;
    }
  };

  // 本文（サムネイル + 最初のコメント）
  let bodyHTML = '';

  if (thumbnailUrl) {
    bodyHTML += generateThumbnailHTML(thumbnailUrl);
  }
  if (selectedComments.length > 0) {
    bodyHTML += await formatComment(selectedComments[0]);
  }

  // フッター（2つめ以降のコメント + 引用元リンク）
  let footerHTML = '';
  if (selectedComments.length > 1) {
    const footerComments = await Promise.all(selectedComments.slice(1).map(comment => formatComment(comment)));
    footerHTML = footerComments.join('\n\n');
  }

  if (footerHTML) {
    footerHTML += '\n\n';
  }
  // girls-matome以外の場合のみ引用元リンクを追加（girls-matomeは別フィールドで管理）
  if (blogType !== 'girls-matome') {
    footerHTML += generateSourceLinkHTML(talk, sourceInfo);
  }
  footerHTML += '\n<!-- Generated by まとめるん (https://matomeln.com/) -->';

  return {
    title: titleHTML,
    body: bodyHTML,
    footer: footerHTML
  };
}

// リッチHTML（CSS付き）
async function generateRichHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions,
  sourceInfo?: SourceInfo | null,
  customName?: string,
  customNameBold?: boolean,
  customNameColor?: string,
  thumbnailUrl?: string,
  showIdInHtml?: boolean,
  skipOgp?: boolean,
  blogType?: BlogType
): Promise<GeneratedHTML> {
  const { includeImages, includeTimestamp, includeName } = options;

  const styleHTML = `<style>
.res_div {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
}
.t_h {
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 10px;
  font-size: 14px;
}
.t_b {
  padding: 10px 0;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.8;
}
.t_b img {
  width: 100%;
  border-radius: 8px;
  margin: 10px 5px;
}
</style>`;

  const titleHTML = escapeHtml(sanitizeThreadTitle(talk.title));

  // コメントをHTML化する関数
  const formatComment = async (comment: CommentWithStyle) => {
    const individualColor = comment.color || '#000000';
    // 個別のコメントのサイズを適用（小:14px, 中:18px, 大:22px）
    const individualFontSize = comment.fontSize === 'small' ? '14px' : comment.fontSize === 'large' ? '22px' : '18px';
    // line-heightはfont-sizeの1.5倍
    const lineHeight = comment.fontSize === 'small' ? '21px' : comment.fontSize === 'large' ? '33px' : '27px';
    // コメント本文のスタイル（options.commentStyle.boldの設定を反映）
    const boldStyle = options.commentStyle.bold ? 'font-weight:bold;' : '';
    const commentStyle = `${boldStyle}font-size:${individualFontSize};line-height:${lineHeight};color:${individualColor};margin-top:10px;`;

    // 名前の表示 - カスタム名が設定されていればそれを使用、なければ元のコメントの名前
    const displayName = escapeHtml(customName || comment.name || '匿名');
    const nameColor = customName ? (customNameColor || 'pink') : 'pink';
    const nameBold = customName ? (customNameBold !== false) : true;

    const timestamp = includeTimestamp
      ? formatDateForMatome(comment.created_at)
      : '';

    // ID表示
    const idDisplay = showIdInHtml && comment.name_id
      ? `ID:${escapeHtml(comment.name_id)}`
      : '';

    // ヘッダー情報を組み立て（timestampとIDをまとめてsilver色に）
    const headerInfo = [timestamp, idDisplay].filter(Boolean).join(' ');
    const headerInfoHTML = headerInfo ? `<span style="color: silver;">${headerInfo}</span>` : '';

    let imageHTML = '';
    if (includeImages && comment.images && comment.images.length > 0) {
      imageHTML = comment.images.filter(img => img && typeof img === 'string').map(img => {
        const imageUrl = img.startsWith('http') ? img : `https://cdn.shikutoku.me${img.startsWith('/') ? img : '/' + img}`;
        return `<img src="${imageUrl}" style="width:100%;margin:5px;" />`;
      }).join('');
    }

    // アンカーを含むコメントかどうか判定
    const hasAnchor = />>?\d+/.test(comment.body);
    const indentStyle = hasAnchor ? 'margin-left:10px;' : '';

    const formattedBody = await formatRichCommentBody(comment.body, skipOgp, shouldUseKotoriaCompactHtml(blogType), shouldEmbedImgur(blogType));
    const responseTail = matomeResponseTailHtml(blogType);

    if (hasAnchor) {
      return `<div class="res_div"><div class="t_h t_i" style="${indentStyle}">${comment.res_id}: <span style="font-weight: ${nameBold ? 'bold' : 'normal'}; color: ${nameColor};">${displayName}</span> ${headerInfoHTML}</div>
<div style="${commentStyle}${indentStyle}" class="t_b t_i">${formattedBody}${imageHTML ? `<div>${imageHTML}</div>` : ''}</div>${responseTail}`;
    } else {
      return `<div class="res_div"><div class="t_h">${comment.res_id}: <span style="font-weight: ${nameBold ? 'bold' : 'normal'}; color: ${nameColor};">${displayName}</span> ${headerInfoHTML}</div>
<div style="${commentStyle}" class="t_b">${formattedBody}${imageHTML ? `<div>${imageHTML}</div>` : ''}</div>${responseTail}`;
    }
  };

  // 本文（スタイル + サムネイル + 最初のコメント）
  let bodyHTML = styleHTML + '\n';

  if (thumbnailUrl) {
    bodyHTML += generateThumbnailHTML(thumbnailUrl);
  }
  if (selectedComments.length > 0) {
    bodyHTML += await formatComment(selectedComments[0]);
  }

  // フッター（2つめ以降のコメント + 引用元リンク）
  let footerHTML = '';
  if (selectedComments.length > 1) {
    const footerComments = await Promise.all(selectedComments.slice(1).map(comment => formatComment(comment)));
    footerHTML = footerComments.join('\n\n');
  }

  if (footerHTML) {
    footerHTML += '\n\n';
  }
  // girls-matome以外の場合のみ引用元リンクを追加（girls-matomeは別フィールドで管理）
  if (blogType !== 'girls-matome') {
    footerHTML += generateSourceLinkHTML(talk, sourceInfo);
  }
  footerHTML += '\n<!-- Generated by まとめるん (https://matomeln.com/) -->';

  return {
    title: titleHTML,
    body: bodyHTML,
    footer: footerHTML
  };
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// OGP情報を取得する関数
async function fetchOGP(url: string): Promise<{title: string, description: string, image: string, siteName: string} | null> {
  try {
    const response = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Twitter oEmbed情報を取得する関数
async function fetchTwitterOEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json() as { html?: string };
    return data.html || null;
  } catch {
    return null;
  }
}

function getImgurEmbedDataId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isImgurHost = hostname === 'imgur.com' || hostname === 'www.imgur.com' || hostname === 'm.imgur.com' || hostname === 'i.imgur.com';
    if (!isImgurHost) return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const cleanId = (value: string): string => value
      .replace(/\.(?:jpe?g|png|gif|webp|gifv|mp4)$/i, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    if (hostname === 'i.imgur.com') {
      const id = cleanId(segments[0]);
      return id || null;
    }

    const firstSegment = segments[0].toLowerCase();
    if ((firstSegment === 'a' || firstSegment === 'gallery') && segments[1]) {
      const id = cleanId(segments[1]);
      return id ? `${firstSegment}/${id}` : null;
    }

    if (firstSegment === 'r' && segments[2]) {
      const id = cleanId(segments[2]);
      return id || null;
    }

    const id = cleanId(segments[0]);
    return id || null;
  } catch {
    return null;
  }
}

function generateImgurEmbedHTML(dataId: string): string {
  const safeDataId = escapeHtml(dataId);
  return `<div class="imgur-embed-wrapper" style="margin:8px 0 10px;"><blockquote class="imgur-embed-pub" lang="en" data-id="${safeDataId}"></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script></div>`;
}

function generateOgpCardHTML(
  url: string,
  title: string,
  description: string,
  image: string,
  siteName: string
): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = image ? escapeHtml(image) : '';
  const safeSiteName = escapeHtml(siteName);
  const imageHTML = safeImage
    ? `<div style="flex:0 0 min(32%,136px);align-self:stretch;min-height:112px;background:#f2f4f7;overflow:hidden;"><img src="${safeImage}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;min-height:112px;object-fit:cover;" /></div>`
    : '';

  return `<a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${safeTitle}" style="display:flex;width:100%;max-width:680px;min-height:112px;border:1px solid #d9dee7;border-radius:8px;overflow:hidden;margin:6px 0 12px;text-decoration:none;color:#101828;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.06);box-sizing:border-box;"><div style="display:flex;flex:1;min-width:0;flex-direction:column;justify-content:center;padding:12px 14px;box-sizing:border-box;"><div style="margin:0 0 5px;color:#667085;font-size:11px;line-height:1.35;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeSiteName}</div><div style="margin:0;color:#101828;font-size:15px;line-height:1.45;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeTitle}</div>${safeDescription ? `<div style="margin:6px 0 0;color:#667085;font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeDescription}</div>` : ''}</div>${imageHTML}</a>`;
}

function generateOgpFallbackCardHTML(url: string, hostname: string): string {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;max-width:680px;border:1px solid #d9dee7;border-radius:8px;padding:12px 14px;margin:6px 0 12px;text-decoration:none;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,0.06);box-sizing:border-box;"><div style="color:#101828;font-size:13px;line-height:1.45;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(hostname)}</div><div style="margin-top:4px;color:#667085;font-size:11px;line-height:1.4;word-break:break-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${url}</div></a>`;
}

// URLをリンクカードに変換する関数（OGP情報付き）
// skipOgp=trueの場合はOGP取得をスキップしてシンプルなリンクに変換
async function linkifyUrlsToCards(text: string, skipOgp?: boolean, embedImgur = true): Promise<string> {
  // URLパターンにマッチする正規表現（日本語括弧や句読点で終了）
  const urlRegex = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+)/g;
  const urls: string[] = [];
  const matches = text.matchAll(urlRegex);

  for (const match of matches) {
    urls.push(match[0]);
  }

  // HTMLエンティティをデコード（&amp; -> &）
  const unescapeHtml = (str: string): string => {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  // まずURLをプレースホルダーに置換してから、最後にHTMLに変換
  // これにより、カードHTML内のURLが後続の置換で壊れることを防ぐ
  const placeholders: Map<string, string> = new Map();
  let result = text;

  // 第1パス: URLをプレースホルダーに置換
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const placeholder = `__URL_PLACEHOLDER_${i}__`;
    placeholders.set(placeholder, url);
    // 最初の1つだけ置換（同じURLが複数ある場合も各々プレースホルダーに）
    const idx = result.indexOf(url);
    if (idx !== -1) {
      result = result.substring(0, idx) + placeholder + result.substring(idx + url.length);
    }
  }

  // 第2パス: OGP取得が必要なURLを特定し、並列取得
  const ogpTargets: Map<string, string> = new Map(); // placeholder -> originalUrl
  for (const [placeholder, url] of placeholders) {
    const originalUrl = unescapeHtml(url);
    if (
      !skipOgp &&
      !getImgurEmbedDataId(originalUrl) &&
      !/^https?:\/\/(twitter\.com|x\.com)\//.test(originalUrl) &&
      !/^https?:\/\/([a-z0-9]+\.)?(5ch\.net|open2ch\.net|2ch\.sc)\//.test(originalUrl)
    ) {
      ogpTargets.set(placeholder, originalUrl);
    }
  }

  // OGPを並列取得
  const ogpResults = new Map<string, Awaited<ReturnType<typeof fetchOGP>>>();
  if (ogpTargets.size > 0) {
    const entries = Array.from(ogpTargets.entries());
    const results = await Promise.all(entries.map(([, originalUrl]) => fetchOGP(originalUrl)));
    entries.forEach(([placeholder], i) => {
      ogpResults.set(placeholder, results[i]);
    });
  }

  // 第3パス: 各プレースホルダーをカードHTMLに変換
  for (const [placeholder, url] of placeholders) {
    const originalUrl = unescapeHtml(url);
    let cardHTML = '';
    const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0066cc;text-decoration:underline;word-break:break-all;">${url}</a>`;

    const imgurDataId = getImgurEmbedDataId(originalUrl);

    if (imgurDataId && embedImgur) {
      cardHTML = `${linkHTML}<br />\n${generateImgurEmbedHTML(imgurDataId)}`;
    }
    else if (imgurDataId) {
      cardHTML = linkHTML;
    }
    else if (/^https?:\/\/(twitter\.com|x\.com)\//.test(originalUrl)) {
      cardHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1d9bf0;text-decoration:underline;word-break:break-all;">${url}</a>`;
    }
    else if (/^https?:\/\/([a-z0-9]+\.)?(5ch\.net|open2ch\.net|2ch\.sc)\//.test(originalUrl)) {
      cardHTML = linkHTML;
    }
    else if (skipOgp) {
      cardHTML = linkHTML;
    }
    else {
      const ogp = ogpResults.get(placeholder);

      if (ogp && ogp.title) {
        let hostname = '';
        try {
          hostname = ogp.siteName || new URL(originalUrl).hostname;
        } catch {
          hostname = ogp.siteName || originalUrl;
        }
        cardHTML = `${linkHTML}<br />${generateOgpCardHTML(url, ogp.title, ogp.description, ogp.image, hostname)}`;
      } else {
        let hostname = '';
        try {
          hostname = new URL(originalUrl).hostname;
        } catch {
          hostname = originalUrl;
        }
        cardHTML = `${linkHTML}<br />${generateOgpFallbackCardHTML(url, hostname)}`;
      }
    }

    result = result.replace(placeholder, cardHTML);
  }

  return result;
}

// URLをリンクに変換する関数（フォールバック用）
function linkifyUrls(text: string): string {
  // URLパターンにマッチする正規表現
  const urlRegex = /(https?:\/\/[^\s<>]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #0066cc; text-decoration: underline;">$1</a>');
}

// 5chのアイコンURLなど不要なURLを除去
function remove5chIconUrls(body: string): string {
  // 5chアイコンURL（img.5ch.net/ico/ または img.5ch.io/ico/）だけを除去
  // 例: https://img.5ch.net/ico/syobo2.gif
  // 例: sssp://img.5ch.net/ico/syobo2.gif
  const iconUrlPattern = /(?:sssp:\/\/|https?:\/\/)img\.5ch\.(?:net|io)\/ico\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+/gi;

  return body
    .split('\n')
    .map((line) => {
      const hasIconUrl = /(?:sssp:\/\/|https?:\/\/)img\.5ch\.(?:net|io)\/ico\//i.test(line);
      const cleaned = line.replace(iconUrlPattern, '').replace(/[ \t]{2,}/g, ' ').trimEnd();
      return hasIconUrl && !cleaned.trim() ? null : cleaned;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}

// まとめくす風の本文フォーマット
async function formatCommentBodyForMatome(body: string, skipOgp?: boolean, compactLineBreaks?: boolean, embedImgur = true): Promise<string> {
  // 5chアイコンURLを除去
  const cleanedBody = normalizeCommentBodyLineBreaks(remove5chIconUrls(body));

  // URLをエスケープ前に抽出してプレースホルダーに置換（&を含むURLの破損を防ぐ）
  const urlRegex = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+)/g;
  const urlPlaceholders: Map<string, string> = new Map();
  let placeholderIndex = 0;
  const bodyWithPlaceholders = cleanedBody.replace(urlRegex, (url) => {
    const placeholder = `__PRE_ESCAPE_URL_${placeholderIndex++}__`;
    urlPlaceholders.set(placeholder, url);
    return placeholder;
  });

  // HTMLエスケープ + 改行変換
  let formatted = escapeHtml(bodyWithPlaceholders).replace(/\n/g, '<br />');

  // アンカーリンクを作成（>>数字）
  formatted = formatted.replace(/&gt;&gt;(\d+)/g, (match, num) => {
    return `<a href="#${num}" style="color: #467CE2; text-decoration: none; font-weight: bold;">&gt;&gt;${num}</a>`;
  });

  // プレースホルダーを元のURLに戻す（エスケープ済みテキスト内のプレースホルダーはそのまま残っている）
  for (const [placeholder, url] of urlPlaceholders) {
    formatted = formatted.replace(placeholder, escapeHtml(url));
  }

  // URLをリンクカードに変換（エスケープ済みURLに対してマッチ）
  formatted = await linkifyUrlsToCards(formatted, skipOgp, embedImgur);

  return formatted;
}

async function formatRichCommentBody(body: string, skipOgp?: boolean, compactLineBreaks?: boolean, embedImgur = true): Promise<string> {
  // 5chアイコンURLを除去
  const cleanedBody = normalizeCommentBodyLineBreaks(remove5chIconUrls(body));

  // URLをエスケープ前に抽出してプレースホルダーに置換（&を含むURLの破損を防ぐ）
  const urlRegex = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+)/g;
  const urlPlaceholders: Map<string, string> = new Map();
  let placeholderIndex = 0;
  const bodyWithPlaceholders = cleanedBody.replace(urlRegex, (url) => {
    const placeholder = `__PRE_ESCAPE_URL_${placeholderIndex++}__`;
    urlPlaceholders.set(placeholder, url);
    return placeholder;
  });

  let lines = bodyWithPlaceholders.split('\n');
  let formatted: string[] = [];

  for (let line of lines) {
    if (line.startsWith('>') && !/^>>?\d+/.test(line)) {
      let escapedLine = escapeHtml(line);
      // プレースホルダーを元のエスケープ済みURLに戻す
      for (const [placeholder, url] of urlPlaceholders) {
        escapedLine = escapedLine.replace(placeholder, escapeHtml(url));
      }
      escapedLine = await linkifyUrlsToCards(escapedLine, skipOgp, embedImgur);
      formatted.push(`<div class="quote_line">${escapedLine}</div>`);
    } else {
      let escapedLine = escapeHtml(line);
      escapedLine = escapedLine.replace(/&gt;&gt;(\d+)/g, (match, num) => {
        return `<a href="#${num}" class="anchor_link">&gt;&gt;${num}</a>`;
      });
      // プレースホルダーを元のエスケープ済みURLに戻す
      for (const [placeholder, url] of urlPlaceholders) {
        escapedLine = escapedLine.replace(placeholder, escapeHtml(url));
      }
      escapedLine = await linkifyUrlsToCards(escapedLine, skipOgp, embedImgur);
      formatted.push(escapedLine);
    }
  }

  return formatted.join('<br>');
}

// まとめくす風の日付フォーマット
function formatDateForMatome(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 曜日
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];

  return `${year}/${month}/${day}(${weekday}) ${hours}:${minutes}:${seconds}`;
}
