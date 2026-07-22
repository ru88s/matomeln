import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface PostKotoriaRequest {
  apiUrl: string;
  apiKey: string;
  title: string;
  body: string;
  sourceUrl?: string;
  tags?: string;
  thumbnailUrl?: string;
  status?: 'draft' | 'published';
}

function truncateText(text: string, maxLength: number): string {
  const characters = Array.from(text);
  return characters.length <= maxLength
    ? text
    : `${characters.slice(0, Math.max(0, maxLength - 3)).join('')}...`;
}

function generateExcerpt(html: string, maxLength: number = 120): string {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return truncateText(text, maxLength);
}

async function readJsonResponse(response: Response): Promise<{ success?: boolean; data?: { url?: string }; error?: string }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { success?: boolean; data?: { url?: string }; error?: string };
  } catch {
    return { error: text };
  }
}

const KOTORIA_WORD_REPLACEMENTS: Record<string, string> = {
  '儲かる': '収益につながる',
};

function getKotoriaNgWord(error?: string): string | null {
  return error?.match(/NGワード[「"]([^」"]+)[」"]/)?.[1] || null;
}

function replaceKotoriaNgWord(value: string, word: string): string {
  const replacement = KOTORIA_WORD_REPLACEMENTS[word] || word.charAt(0);
  return value.split(word).join(replacement);
}

export async function POST(request: NextRequest) {
  try {
    const { apiUrl, apiKey, title, body, sourceUrl, tags, thumbnailUrl, status = 'published' } = await request.json() as PostKotoriaRequest;

    if (!apiUrl || !apiKey || !title || !body) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています（apiUrl, apiKey, title, body）' },
        { status: 400 }
      );
    }

    const endpoint = `${apiUrl.replace(/\/$/, '')}/api/kotoria/posts`;
    const payload = {
      title,
      bodyHtml: body,
      excerpt: generateExcerpt(body),
      sourceUrl: sourceUrl || '',
      tags: tags || '',
      thumbnailUrl: thumbnailUrl || '',
      status,
    };
    let response!: Response;
    let data: { success?: boolean; data?: { url?: string }; error?: string } = {};

    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      data = await readJsonResponse(response);
      if (response.ok) break;

      const ngWord = response.status === 400 ? getKotoriaNgWord(data.error) : null;
      if (!ngWord || attempt === 5) break;
      payload.title = replaceKotoriaNgWord(payload.title, ngWord);
      payload.bodyHtml = replaceKotoriaNgWord(payload.bodyHtml, ngWord);
      payload.excerpt = truncateText(replaceKotoriaNgWord(payload.excerpt, ngWord), 120);
      payload.tags = replaceKotoriaNgWord(payload.tags, ngWord);
    }

    if (response.ok && data.success) {
      return NextResponse.json({
        success: true,
        message: 'Kotoriaに記事を投稿しました',
        url: data.data?.url,
        data: data.data,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('認証エラー: Kotoria APIキーが正しくありません');
    }

    throw new Error(`Kotoria APIエラー: ${response.status} - ${data.error || 'Unknown error'}`);
  } catch (error) {
    logger.error('Error posting to Kotoria:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const details = errorMessage === 'fetch failed'
      ? `Kotoria APIへの接続に失敗しました: ${errorMessage}`
      : errorMessage;

    return NextResponse.json(
      {
        error: details.includes('認証エラー')
          ? details
          : 'Kotoriaへの投稿に失敗しました',
        details,
      },
      { status: 500 }
    );
  }
}
