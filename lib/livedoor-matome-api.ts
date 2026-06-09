import { Talk, Comment } from './types';

export interface LivedoorMatomeArticleInfo {
  articleId: string;
  host: string;
}

export function parseLivedoorMatomeUrl(url: string): LivedoorMatomeArticleInfo | null {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return null;

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    const articleMatch =
      path.match(/\/archives\/(\d+)\.html$/) ||
      path.match(/\/acv\/(\d+)\.html$/);

    if (!articleMatch) return null;

    return {
      articleId: articleMatch[1],
      host,
    };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ''));
}

function extractTitle(html: string): string {
  const h1Match = html.match(/<h1[^>]*class="[^"]*article-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h1>/i)
    || html.match(/<h1[^>]*class="[^"]*detail_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const rawTitle = h1Match ? stripTags(h1Match[1]) : 'まとめ記事';
  return rawTitle
    .replace(/\s*:\s*(ガールズVIPまとめ|まとめブレイド)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPublishedAt(html: string): string {
  const abbrMatch = html.match(/<abbr[^>]+class="[^"]*updated[^"]*"[^>]+title="([^"]+)"/i);
  if (abbrMatch) return abbrMatch[1];

  const articleDateMatch = html.match(/<p[^>]+class="[^"]*article-date[^"]*"[^>]+title="([^"]+)"/i);
  if (articleDateMatch) return articleDateMatch[1];

  const ldDateMatch = html.match(/date\s*:\s*'([^']+)'/i);
  if (ldDateMatch) return parseJapaneseDateTime(ldDateMatch[1]);

  return new Date().toISOString();
}

function parseJapaneseDateTime(dateStr: string): string {
  const match = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return new Date().toISOString();
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5]}:${match[6] || '00'}+09:00`;
}

function findClosingDiv(html: string, openTagStart: number): number {
  const openTagEnd = html.indexOf('>', openTagStart);
  if (openTagEnd < 0) return -1;

  let depth = 1;
  const tagRegex = /<\/?div\b[^>]*>/gi;
  tagRegex.lastIndex = openTagEnd + 1;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    if (tag.startsWith('</')) {
      depth -= 1;
      if (depth === 0) return tagRegex.lastIndex;
    } else if (!tag.endsWith('/>')) {
      depth += 1;
    }
  }

  return -1;
}

function extractResDivs(html: string): string[] {
  const blocks: string[] = [];
  const startRegex = /<div\b[^>]*class="[^"]*\bres_div\b[^"]*"[^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = startRegex.exec(html)) !== null) {
    const end = findClosingDiv(html, match.index);
    if (end < 0) continue;
    blocks.push(html.slice(match.index, end));
    startRegex.lastIndex = end;
  }

  return blocks;
}

function extractClassDiv(block: string, className: string): string {
  const regex = new RegExp(`<div\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const match = regex.exec(block);
  if (!match) return '';
  const end = findClosingDiv(block, match.index);
  if (end < 0) return '';
  return block.slice(match.index + match[0].length, end - '</div>'.length);
}

function parseHeader(headerHtml: string): { resId: string; name: string; nameId?: string; createdAt: string } {
  const resId = stripTags(headerHtml).match(/^\s*(\d+)\s*:/)?.[1] || '1';
  const spans = [...headerHtml.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(match => stripTags(match[1]).trim()).filter(Boolean);
  const name = spans[0] || '名無しさん';
  const meta = spans[1] || stripTags(headerHtml);
  const nameId = meta.match(/\bID:([A-Za-z0-9+/_.-]+)/)?.[1];
  const dateMatch = meta.match(/(\d{4}\/\d{1,2}\/\d{1,2}\([^)]+\)\s*\d{1,2}:\d{2}:\d{2})/);

  return {
    resId,
    name,
    nameId,
    createdAt: dateMatch ? parseThreadDate(dateMatch[1]) : new Date().toISOString(),
  };
}

function parseThreadDate(dateStr: string): string {
  const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\([^)]+\)\s*(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return new Date().toISOString();
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5]}:${match[6]}+09:00`;
}

function extractImages(bodyHtml: string): string[] {
  const images = new Set<string>();
  const imgRegex = /<img\b[^>]+(?:src|data-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^"']*)?)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(bodyHtml)) !== null) {
    const url = decodeHtmlEntities(match[1]);
    if (url.includes('doubleclick') || url.includes('googlesyndication') || url.includes('analytics')) continue;
    images.add(url);
  }
  return [...images];
}

function cleanBody(bodyHtml: string): string {
  return bodyHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a\b[^>]*href=["']#(\d+)["'][^>]*>[\s\S]*?<\/a>/gi, '>>$1')
    .replace(/<a\b[^>]*style=["'][^"']*display\s*:\s*block[^"']*["'][^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = stripTags(text).trim();
      return label && label !== href ? `${label}\n${href}` : href;
    })
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(line => decodeHtmlEntities(line).replace(/[ \t　]+/g, ' ').trim())
    .filter((line, index, lines) => line.length > 0 && line !== lines[index - 1])
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseLivedoorMatomeHtml(html: string, articleUrl: string): { talk: Talk; comments: Comment[] } {
  const articleInfo = parseLivedoorMatomeUrl(articleUrl);
  if (!articleInfo) {
    throw new Error('対応していないまとめ記事URLです');
  }

  const title = extractTitle(html);
  const articleCreatedAt = extractPublishedAt(html);
  const resBlocks = extractResDivs(html);

  const comments = resBlocks.map((block, index): Comment | null => {
    const headerHtml = extractClassDiv(block, 't_h');
    const bodyHtml = extractClassDiv(block, 't_b');
    if (!bodyHtml) return null;

    const header = parseHeader(headerHtml);
    const body = cleanBody(bodyHtml);
    if (!body) return null;

    return {
      id: `matome-${articleInfo.articleId}-${header.resId}-${index}`,
      res_id: header.resId,
      name: header.name,
      name_id: header.nameId,
      body,
      talk_id: articleInfo.articleId,
      created_at: header.createdAt,
      images: extractImages(bodyHtml),
    };
  }).filter((comment): comment is Comment => Boolean(comment));

  if (comments.length === 0) {
    throw new Error('まとめ記事からレスを抽出できませんでした');
  }

  const talk: Talk = {
    id: `matome-${articleInfo.articleId}`,
    title,
    body: '',
    created_at: comments[0]?.created_at || articleCreatedAt,
    updated_at: comments[comments.length - 1]?.created_at || articleCreatedAt,
    views_count: 0,
    sage_count: 0,
    hash_id: articleInfo.articleId,
    comment_count: comments.length,
    show_id: true,
  };

  return { talk, comments };
}

export async function fetchLivedoorMatomeArticle(url: string): Promise<{ talk: Talk; comments: Comment[] } | null> {
  const articleInfo = parseLivedoorMatomeUrl(url);
  if (!articleInfo) {
    throw new Error('無効なまとめ記事URLです');
  }

  const response = await fetch(`/api/proxy/getLivedoorMatome?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || 'まとめ記事の取得に失敗しました');
  }

  const data = await response.json() as { content?: string; canonicalUrl?: string };
  return parseLivedoorMatomeHtml(data.content || '', data.canonicalUrl || url);
}
