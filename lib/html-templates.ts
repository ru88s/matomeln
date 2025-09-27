import { Talk, Comment, CommentWithStyle, MatomeOptions } from './types';

export interface GeneratedHTML {
  title: string;
  body: string;
  footer: string;
}

export function generateMatomeHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions
): GeneratedHTML {
  const { includeImages, style, includeTimestamp, includeName } = options;

  if (style === 'rich') {
    return generateRichHTML(talk, selectedComments, options);
  }

  return generateSimpleHTML(talk, selectedComments, options);
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

// まとめくす風のシンプルなHTML
function generateSimpleHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions
): GeneratedHTML {
  const { includeTimestamp, includeName, includeImages } = options;

  // タイトル部分
  const titleHTML = `【まとめ】${escapeHtml(talk.title)}`;

  // コメントをHTML化する関数
  const formatComment = (comment: CommentWithStyle) => {
    const individualColor = comment.color || '#000000';
    const commentStyle = `color: ${individualColor}; ${options.commentStyle.bold ? 'font-weight: bold;' : ''} font-size: ${options.commentStyle.fontSize === 'small' ? '14px' : options.commentStyle.fontSize === 'large' ? '18px' : '16px'};`;
    // 名前の表示 - 元のコメントの名前をそのまま使用
    const nameDisplay = comment.name && comment.name !== ''
      ? `<span style="color: #ff69b4; font-weight: bold;">${escapeHtml(comment.name)}</span>`
      : '<span style="color: #ff69b4; font-weight: bold;">匿名</span>';

    const timestamp = includeTimestamp
      ? `<span style="color: silver;"> ${formatDateForMatome(comment.created_at)} </span>`
      : '';

    // 画像の処理 - 200pxに縮小
    let imageHTML = '';
    if (includeImages && comment.images && comment.images.length > 0) {
      imageHTML = comment.images.map(img => {
        const imageUrl = img.startsWith('http') ? img : `https://cdn.shikutoku.me${img.startsWith('/') ? img : '/' + img}`;
        return `<div style="margin: 10px 0;"><img src="${imageUrl}" style="max-width: 200px; max-height: 200px;" /></div>`;
      }).join('');
    }

    return `<div class="res_div">
<div class="t_h">
${comment.res_id}: ${nameDisplay}${timestamp}
</div>
<div class="t_b" style="margin-top:10px; ${commentStyle}">
${formatCommentBodyForMatome(comment.body)}
</div>${imageHTML ? `
${imageHTML}` : ''}
</div>`;
  };

  // 本文（最初のコメントのみ）
  const bodyHTML = selectedComments.length > 0 ? formatComment(selectedComments[0]) : '';

  // フッター（2つめ以降のコメント + 引用元リンク）
  let footerHTML = '';
  if (selectedComments.length > 1) {
    footerHTML = selectedComments.slice(1).map(comment => formatComment(comment)).join('\n\n');
  }
  if (footerHTML) {
    footerHTML += '\n\n';
  }
  footerHTML += `引用元: <a href="https://shikutoku.me/talks/${talk.id}" target="_blank">https://shikutoku.me/talks/${talk.id}</a>`;

  return {
    title: titleHTML,
    body: bodyHTML,
    footer: footerHTML
  };
}

// リッチHTML（CSS付き）
function generateRichHTML(
  talk: Talk,
  selectedComments: CommentWithStyle[],
  options: MatomeOptions
): GeneratedHTML {
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

  const titleHTML = `【まとめ】${escapeHtml(talk.title)}`;

  // コメントをHTML化する関数
  const formatComment = (comment: CommentWithStyle) => {
    const individualColor = comment.color || '#000000';
    const commentStyle = `color: ${individualColor}; ${options.commentStyle.bold ? 'font-weight: bold;' : ''} font-size: ${options.commentStyle.fontSize === 'small' ? '14px' : options.commentStyle.fontSize === 'large' ? '18px' : '16px'};`;

    // 名前の表示 - 元のコメントの名前をそのまま使用
    const nameDisplay = comment.name && comment.name !== ''
      ? escapeHtml(comment.name)
      : '匿名';

    const timestamp = includeTimestamp
      ? formatDateForMatome(comment.created_at)
      : '';

    let imageHTML = '';
    if (includeImages && comment.images && comment.images.length > 0) {
      imageHTML = comment.images.map(img => {
        const imageUrl = img.startsWith('http') ? img : `https://cdn.shikutoku.me${img.startsWith('/') ? img : '/' + img}`;
        return `<img src="${imageUrl}" style="max-width: 200px; max-height: 200px; margin: 5px;" />`;
      }).join('');
    }

    return `<div class="res_div">
<div class="t_h">
  ${comment.res_id}: <span style="color: #ff69b4; font-weight: bold;">${nameDisplay}</span>
  ${timestamp ? `<span style="color: #999; font-size: 12px; margin-left: 10px;">${timestamp}</span>` : ''}
</div>
<div class="t_b" style="${commentStyle}">
${formatRichCommentBody(comment.body)}
${imageHTML ? `<div>${imageHTML}</div>` : ''}
</div>
</div>`;
  };

  // 本文（最初のコメントのみ + スタイル）
  const bodyHTML = styleHTML + '\n' + (selectedComments.length > 0 ? formatComment(selectedComments[0]) : '');

  // フッター（2つめ以降のコメント + 引用元リンク）
  let footerHTML = '';
  if (selectedComments.length > 1) {
    footerHTML = selectedComments.slice(1).map(comment => formatComment(comment)).join('\n\n');
  }
  if (footerHTML) {
    footerHTML += '\n\n';
  }
  footerHTML += `引用元: <a href="https://shikutoku.me/talks/${talk.id}" target="_blank">https://shikutoku.me/talks/${talk.id}</a>`;

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

// URLをリンクに変換する関数
function linkifyUrls(text: string): string {
  // URLパターンにマッチする正規表現
  const urlRegex = /(https?:\/\/[^\s<>]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #0066cc; text-decoration: underline;">$1</a>');
}

// まとめくす風の本文フォーマット
function formatCommentBodyForMatome(body: string): string {
  // 改行を<br />に変換
  let formatted = escapeHtml(body).replace(/\n/g, '<br />\n');

  // アンカーリンクを作成（>>数字）
  formatted = formatted.replace(/&gt;&gt;(\d+)/g, (match, num) => {
    return `<a href="#${num}" style="color: #ff69b4; text-decoration: none; font-weight: bold;">&gt;&gt;${num}</a>`;
  });

  // URLをリンクに変換
  formatted = linkifyUrls(formatted);

  return formatted;
}

function formatRichCommentBody(body: string): string {
  let lines = body.split('\n');
  let formatted: string[] = [];

  for (let line of lines) {
    // 引用行の処理（>で始まる）
    if (line.startsWith('>')) {
      let escapedLine = escapeHtml(line);
      // URLをリンクに変換（引用行でも）
      escapedLine = linkifyUrls(escapedLine);
      formatted.push(`<div class="quote_line">${escapedLine}</div>`);
    } else {
      // 通常の行
      let escapedLine = escapeHtml(line);
      // アンカーリンクを作成
      escapedLine = escapedLine.replace(/&gt;&gt;(\d+)/g, (match, num) => {
        return `<a href="#${num}" class="anchor_link">&gt;&gt;${num}</a>`;
      });
      // URLをリンクに変換
      escapedLine = linkifyUrls(escapedLine);
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