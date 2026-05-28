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

  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
}

export async function POST(request: NextRequest) {
  try {
    const { apiUrl, apiKey, title, body, sourceUrl, tags, thumbnailUrl } = await request.json() as PostKotoriaRequest;

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
        status: 'published',
      }),
    });

    const data = await response.json() as { success?: boolean; data?: { url?: string }; error?: string };

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

    return NextResponse.json(
      {
        error: errorMessage.includes('認証エラー')
          ? errorMessage
          : 'Kotoriaへの投稿に失敗しました',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
