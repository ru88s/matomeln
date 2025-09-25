import { Talk, Comment, MatomeOptions } from './types';

export function generateMatomeHTML(
  talk: Talk,
  selectedComments: Comment[],
  options: MatomeOptions
): string {
  const { includeImages, style, includeTimestamp, includeName } = options;

  if (style === 'rich') {
    return generateRichHTML(talk, selectedComments, options);
  }

  return generateSimpleHTML(talk, selectedComments, options);
}

function generateSimpleHTML(
  talk: Talk,
  selectedComments: Comment[],
  options: MatomeOptions
): string {
  const { includeTimestamp, includeName } = options;

  const html = `<div class="shikumato-matome">
<h2>【まとめ】${escapeHtml(talk.title)}</h2>
<hr>
${selectedComments.map(comment => {
  const nameDisplay = includeName ? `<b>${escapeHtml(comment.name)}</b>` : '<b>匿名</b>';
  const timestamp = includeTimestamp ? `<small>${formatDate(comment.created_at)}</small>` : '';

  return `<div style="margin: 15px 0; padding: 10px; border-left: 3px solid #ff69b4;">
  <div style="margin-bottom: 5px;">
    <span style="color: #666;">${comment.res_id}:</span> ${nameDisplay} ${timestamp}
  </div>
  <div style="margin: 10px 0;">${formatCommentBody(comment.body)}</div>
  <div style="text-align: right;">
    <small><a href="https://shikutoku.me/talks/${talk.id}#${comment.res_id}" target="_blank" style="color: #ff69b4;">元コメント →</a></small>
  </div>
</div>`;
}).join('\n')}
<hr>
<div style="margin-top: 20px; padding: 15px; background: #fff0f5; border-radius: 5px;">
  <p style="margin: 0;">元トーク: <a href="https://shikutoku.me/talks/${talk.id}" target="_blank" style="color: #ff69b4; font-weight: bold;">「${escapeHtml(talk.title)}」- シクトク</a></p>
  <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">まとめ作成: <a href="https://matome.shikutoku.me" target="_blank">シクマト</a></p>
</div>
</div>`;

  return html;
}

function generateRichHTML(
  talk: Talk,
  selectedComments: Comment[],
  options: MatomeOptions
): string {
  const { includeImages, includeTimestamp, includeName } = options;

  const html = `<article class="shikumato-rich">
<style>
.shikumato-rich {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
}
.shikumato-header {
  background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
  color: white;
  padding: 20px;
  border-radius: 10px 10px 0 0;
  margin-bottom: 20px;
}
.shikumato-comment {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: box-shadow 0.3s;
}
.shikumato-comment:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.shikumato-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.shikumato-number {
  background: #ff69b4;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
}
.shikumato-body {
  padding: 10px 0;
  white-space: pre-wrap;
}
.shikumato-link {
  display: inline-block;
  color: #ff69b4;
  text-decoration: none;
  font-size: 12px;
  margin-top: 10px;
}
.shikumato-link:hover {
  text-decoration: underline;
}
.shikumato-footer {
  margin-top: 30px;
  padding: 20px;
  background: #fff0f5;
  border-radius: 8px;
  text-align: center;
}
.shikumato-quote {
  background: #f8f8f8;
  border-left: 3px solid #ff69b4;
  padding: 10px;
  margin: 10px 0;
  color: #666;
}
</style>

<div class="shikumato-header">
  <h1 style="margin: 0; font-size: 24px;">【まとめ】${escapeHtml(talk.title)}</h1>
  ${talk.tag_names ? `<div style="margin-top: 10px;">${talk.tag_names.map(tag =>
    `<span style="background: rgba(255,255,255,0.3); padding: 3px 8px; border-radius: 12px; margin-right: 5px; font-size: 12px;">#${escapeHtml(tag)}</span>`
  ).join('')}</div>` : ''}
</div>

${selectedComments.map(comment => {
  const nameDisplay = includeName ? escapeHtml(comment.name) : '匿名';
  const timestamp = includeTimestamp ? formatDate(comment.created_at) : '';
  const bodyHtml = formatRichCommentBody(comment.body);

  return `<div class="shikumato-comment">
  <div class="shikumato-meta">
    <div>
      <span class="shikumato-number">${comment.res_id}</span>
      <span style="margin-left: 10px; font-weight: bold;">${nameDisplay}</span>
      ${timestamp ? `<span style="margin-left: 10px; color: #999; font-size: 12px;">${timestamp}</span>` : ''}
    </div>
  </div>
  <div class="shikumato-body">${bodyHtml}</div>
  ${comment.images && includeImages && comment.images.length > 0 ?
    `<div style="margin-top: 10px;">${comment.images.map(img =>
      `<img src="${img}" style="max-width: 100%; height: auto; margin: 5px 0; border-radius: 8px;" alt="画像">`
    ).join('')}</div>` : ''}
  <a href="https://shikutoku.me/talks/${talk.id}#${comment.res_id}" target="_blank" class="shikumato-link">元コメントを見る →</a>
</div>`;
}).join('\n')}

<div class="shikumato-footer">
  <h3 style="margin: 0 0 10px 0; color: #ff69b4;">元のトークを読む</h3>
  <p style="margin: 10px 0;">
    <a href="https://shikutoku.me/talks/${talk.id}" target="_blank" style="color: #ff69b4; font-size: 18px; font-weight: bold; text-decoration: none;">「${escapeHtml(talk.title)}」</a>
  </p>
  <p style="margin: 10px 0; color: #666; font-size: 14px;">
    シクトク - 女性向け匿名掲示板
  </p>
  <hr style="margin: 15px auto; width: 50%; border: none; border-top: 1px solid #f0f0f0;">
  <p style="margin: 0; font-size: 12px; color: #999;">
    このまとめは <a href="https://matome.shikutoku.me" target="_blank" style="color: #ff69b4;">シクマト</a> で作成されました
  </p>
</div>
</article>`;

  return html;
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

function formatCommentBody(body: string): string {
  // 改行をbrタグに変換
  let formatted = escapeHtml(body).replace(/\n/g, '<br>');

  // アンカーリンクを作成（>>数字）
  formatted = formatted.replace(/>>&gt;(\d+)/g, (match, num) => {
    return `<a href="#${num}" style="color: #ff69b4;">&gt;&gt;${num}</a>`;
  });

  return formatted;
}

function formatRichCommentBody(body: string): string {
  let lines = body.split('\n');
  let formatted: string[] = [];

  for (let line of lines) {
    // 引用行の処理（>で始まる）
    if (line.startsWith('>')) {
      formatted.push(`<div class="shikumato-quote">${escapeHtml(line)}</div>`);
    } else {
      // 通常の行
      let escapedLine = escapeHtml(line);
      // アンカーリンクを作成
      escapedLine = escapedLine.replace(/&gt;&gt;(\d+)/g, (match, num) => {
        return `<a href="#${num}" style="color: #ff69b4;">&gt;&gt;${num}</a>`;
      });
      formatted.push(escapedLine);
    }
  }

  return formatted.join('<br>');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}