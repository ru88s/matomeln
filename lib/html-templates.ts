import { Talk, Comment, CommentWithStyle, MatomeOptions } from './types';

export interface GeneratedHTML {
  title: string;
  body: string;
  footer: string;
}

export interface SourceInfo {
  source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc';
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
  skipOgp?: boolean
): Promise<GeneratedHTML> {
  const { includeImages, style, includeTimestamp, includeName } = options;

  let result: GeneratedHTML;
  if (style === 'rich') {
    result = await generateRichHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, skipOgp);
  } else {
    result = await generateSimpleHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, skipOgp);
  }

  // DEVモードの場合はタイトルの頭に§を追加（ストック記事とわかるように）
  if (isDevMode) {
    result.title = `§ ${result.title}`;
  }

  return result;
}

// 引用元URLを生成
function getSourceUrl(talk: Talk, sourceInfo?: SourceInfo | null): string {
  if (sourceInfo?.source === '5ch' && sourceInfo.originalUrl) {
    // 5chの場合は入力されたURLを整形
    const url = sourceInfo.originalUrl.trim();
    // 末尾のスラッシュやパラメータを除去して正規化
    const match = url.match(/https?:\/\/([a-z0-9]+)\.5ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\/(\d+)/i);
    if (match) {
      return `https://${match[1]}.5ch.net/test/read.cgi/${match[2]}/${match[3]}/`;
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
  // Shikutokuの場合
  return `https://shikutoku.me/talks/${talk.id}`;
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
  // -s.pngを追加してサムネイルURL（小サイズ）を生成
  const thumbnailSmallUrl = thumbnailUrl.replace(/(\.[a-zA-Z]+)$/, '-s$1');

  return `<div align="center"><div align="center"><a href="${thumbnailUrl}" title="no title" target="_blank"><img src="${thumbnailSmallUrl}" width="400" height="400" border="0" alt="no title" hspace="5" class="pict" /></a></div><br /></div>\n\n`;
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
  skipOgp?: boolean
): Promise<GeneratedHTML> {
  const { includeTimestamp, includeName, includeImages } = options;

  // タイトル部分
  const titleHTML = escapeHtml(talk.title);

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
    const nameDisplay = `<span style="font-weight: bold; color: ${nameColor};">${escapeHtml(displayName)}</span>`;

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

    // 画像の処理 - 200pxに縮小
    let imageHTML = '';
    if (includeImages && comment.images && comment.images.length > 0) {
      imageHTML = comment.images.filter(img => img && typeof img === 'string').map(img => {
        const imageUrl = img.startsWith('http') ? img : `https://cdn.shikutoku.me${img.startsWith('/') ? img : '/' + img}`;
        return `<div style="margin:10px 0;"><img src="${imageUrl}" style="max-width:200px;max-height:200px;" /></div>`;
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

    const formattedBody = await formatCommentBodyForMatome(comment.body, skipOgp);

    // 整形されたHTMLを生成
    if (hasAnchor) {
      return `<div class="res_div"><div style="${indentStyle}" class="${headerClass}">
${comment.res_id}: ${nameDisplay} ${headerInfoHTML}</div>
<div style="${commentStyle}${indentStyle}" class="${bodyClass}">
${formattedBody}</div>${imageHTML ? '\n' + imageHTML : ''}<br />
<br /></div>`;
    } else {
      return `<div class="res_div"><div class="${headerClass}">
${comment.res_id}: ${nameDisplay} ${headerInfoHTML}</div>
<div style="${commentStyle}" class="${bodyClass}">
${formattedBody}</div>${imageHTML ? '\n' + imageHTML : ''}<br />
<br /></div>`;
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
  const sourceUrl = getSourceUrl(talk, sourceInfo);
  footerHTML += `<p class="source_link" style="color:gray;text-align:right;">引用元:<a href="${sourceUrl}" target="_blank">${sourceUrl}</a></p>`;
  footerHTML += '\n<!-- Generated by まとめるん (https://matomeln.pages.dev/) -->';

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
  skipOgp?: boolean
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
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.8;
}
.t_b img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin: 10px 5px;
}
</style>`;

  const titleHTML = escapeHtml(talk.title);

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
        return `<img src="${imageUrl}" style="max-width:200px;max-height:200px;margin:5px;" />`;
      }).join('');
    }

    // アンカーを含むコメントかどうか判定
    const hasAnchor = />>?\d+/.test(comment.body);
    const indentStyle = hasAnchor ? 'margin-left:10px;' : '';

    const formattedBody = await formatRichCommentBody(comment.body, skipOgp);

    if (hasAnchor) {
      return `<div class="res_div"><div class="t_h t_i" style="${indentStyle}">
${comment.res_id}: <span style="font-weight: bold; color: ${nameColor};">${displayName}</span> ${headerInfoHTML}</div>
<div style="${commentStyle}${indentStyle}" class="t_b t_i">
${formattedBody}${imageHTML ? `<div>${imageHTML}</div>` : ''}</div><br />
<br /></div>`;
    } else {
      return `<div class="res_div"><div class="t_h">
${comment.res_id}: <span style="font-weight: bold; color: ${nameColor};">${displayName}</span> ${headerInfoHTML}</div>
<div style="${commentStyle}" class="t_b">
${formattedBody}${imageHTML ? `<div>${imageHTML}</div>` : ''}</div><br />
<br /></div>`;
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
  const sourceUrl = getSourceUrl(talk, sourceInfo);
  footerHTML += `<p class="source_link" style="color:gray;text-align:right;">引用元:<a href="${sourceUrl}" target="_blank">${sourceUrl}</a></p>`;
  footerHTML += '\n<!-- Generated by まとめるん (https://matomeln.pages.dev/) -->';

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
    const data = await response.json();
    return data.html || null;
  } catch {
    return null;
  }
}

// URLをリンクカードに変換する関数（OGP情報付き）
// skipOgp=trueの場合はOGP取得をスキップしてシンプルなリンクに変換
async function linkifyUrlsToCards(text: string, skipOgp?: boolean): Promise<string> {
  // URLパターンにマッチする正規表現（日本語括弧や句読点で終了）
  const urlRegex = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+)/g;
  const urls: string[] = [];
  const matches = text.matchAll(urlRegex);

  for (const match of matches) {
    urls.push(match[0]);
  }

  let result = text;

  // 各URLのOGP情報を取得してカードHTMLに変換
  for (const url of urls) {
    // TwitterまたはX.comのURL判定 - シンプルなテキストリンクに変換
    if (/^https?:\/\/(twitter\.com|x\.com)\//.test(url)) {
      const textLink = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1d9bf0;text-decoration:underline;">${url}</a>`;
      result = result.replace(url, textLink);
      continue;
    }

    // 5ch、open2ch、2ch.sc、shikutokuのスレッドURL - シンプルなテキストリンクに変換
    if (/^https?:\/\/([a-z0-9]+\.)?(5ch\.net|open2ch\.net|2ch\.sc|shikutoku\.me)\//.test(url)) {
      const textLink = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0066cc;text-decoration:underline;">${url}</a>`;
      result = result.replace(url, textLink);
      continue;
    }

    // OGPスキップが有効な場合はシンプルなリンクに変換
    if (skipOgp) {
      const textLink = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0066cc;text-decoration:underline;">${url}</a>`;
      result = result.replace(url, textLink);
      continue;
    }

    const ogp = await fetchOGP(url);

    if (ogp && ogp.title) {
      // OGP情報がある場合はカード表示
      const cardHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:10px 0;text-decoration:none;color:inherit;"><div style="display:flex;">${ogp.image ? `<div style="flex-shrink:0;width:128px;height:128px;"><img src="${ogp.image}" alt="${escapeHtml(ogp.title)}" style="width:100%;height:100%;object-fit:cover;" /></div>` : ''}<div style="flex:1;padding:12px;min-width:0;"><div style="font-weight:500;color:#1a1a1a;font-size:14px;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(ogp.title)}</div>${ogp.description ? `<div style="font-size:12px;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:8px;">${escapeHtml(ogp.description)}</div>` : ''}<div style="font-size:12px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ogp.siteName || new URL(url).hostname}</div></div></div></a>`;
      result = result.replace(url, cardHTML);
    } else {
      // OGP情報がない場合はシンプルなカード
      const hostname = new URL(url).hostname;
      const cardHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin:10px 0;text-decoration:none;background:#f9f9f9;"><div style="font-size:13px;color:#333;margin-bottom:4px;word-break:break-all;">${escapeHtml(url)}</div><div style="font-size:11px;color:#666;">${hostname}</div></a>`;
      result = result.replace(url, cardHTML);
    }
  }

  return result;
}

// URLをリンクに変換する関数（フォールバック用）
function linkifyUrls(text: string): string {
  // URLパターンにマッチする正規表現
  const urlRegex = /(https?:\/\/[^\s<>]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #0066cc; text-decoration: underline;">$1</a>');
}

// まとめくす風の本文フォーマット
async function formatCommentBodyForMatome(body: string, skipOgp?: boolean): Promise<string> {
  // 改行を<br />に変換
  let formatted = escapeHtml(body).replace(/\n/g, '<br />\n');

  // アンカーリンクを作成（>>数字）
  formatted = formatted.replace(/&gt;&gt;(\d+)/g, (match, num) => {
    return `<a href="#${num}" style="color: #ff69b4; text-decoration: none; font-weight: bold;">&gt;&gt;${num}</a>`;
  });

  // URLをリンクカードに変換
  formatted = await linkifyUrlsToCards(formatted, skipOgp);

  return formatted;
}

async function formatRichCommentBody(body: string, skipOgp?: boolean): Promise<string> {
  let lines = body.split('\n');
  let formatted: string[] = [];

  for (let line of lines) {
    // 引用行の処理（>で始まる）
    if (line.startsWith('>')) {
      let escapedLine = escapeHtml(line);
      // URLをリンクカードに変換（引用行でも）
      escapedLine = await linkifyUrlsToCards(escapedLine, skipOgp);
      formatted.push(`<div class="quote_line">${escapedLine}</div>`);
    } else {
      // 通常の行
      let escapedLine = escapeHtml(line);
      // アンカーリンクを作成
      escapedLine = escapedLine.replace(/&gt;&gt;(\d+)/g, (match, num) => {
        return `<a href="#${num}" class="anchor_link">&gt;&gt;${num}</a>`;
      });
      // URLをリンクカードに変換
      escapedLine = await linkifyUrlsToCards(escapedLine, skipOgp);
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