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

function generateExcerpt(html: string, maxLength: number = 160): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length <= maxLength ? text : `${text.substring(0, maxLength - 3)}...`;
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
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title,
        bodyHtml: body,
        excerpt: generateExcerpt(body),
        sourceUrl: sourceUrl || '',
        tags: tags || '',
        thumbnailUrl: thumbnailUrl || '',
        status,
      }),
    });

    const data = await readJsonResponse(response);

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
