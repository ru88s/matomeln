import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * ガールズまとめ速報へ記事を投稿するプロキシAPI
 *
 * Request:
 *   - apiUrl: string - APIエンドポイントURL (例: https://girls-matome.example.com)
 *   - apiKey: string - API認証キー
 *   - title: string - 記事タイトル
 *   - body: string - 記事本文HTML
 *   - sourceUrl?: string - 元スレURL
 *   - tags?: string - タグ（カンマ区切り）
 *
 * Response:
 *   - success: boolean
 *   - data?: { id, slug, status }
 *   - error?: string
 */

// タイトルからslugを生成（英数字とハイフンのみ）
function generateSlug(title: string): string {
  // タイムスタンプベースのユニークなslug
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `post-${timestamp}-${random}`;
}

// HTMLから抜粋を生成
function generateExcerpt(html: string, maxLength: number = 200): string {
  // HTMLタグを除去
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

export async function POST(request: NextRequest) {
  try {
    const { apiUrl, apiKey, title, body, sourceUrl, tags } = await request.json();

    if (!apiUrl || !apiKey || !title || !body) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています（apiUrl, apiKey, title, body）' },
        { status: 400 }
      );
    }

    // APIエンドポイントを構築
    const endpoint = `${apiUrl.replace(/\/$/, '')}/api/posts/import`;

    // slugを生成
    const slug = generateSlug(title);

    // 抜粋を生成
    const excerpt = generateExcerpt(body);

    // リクエストボディを構築
    const requestBody = {
      slug,
      title,
      body_html: body,
      excerpt,
      source_url: sourceUrl || '',
      tags: tags || '',
    };

    logger.log('ガールズまとめAPI endpoint:', endpoint);
    logger.log('Request body slug:', slug);
    logger.log('Request body title:', title);

    // ガールズまとめAPIへPOST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    logger.log('Response status:', response.status);

    const data = await response.json();

    if (response.ok && data.success) {
      logger.log('投稿成功:', data);

      return NextResponse.json({
        success: true,
        message: 'ガールズまとめ速報に記事を投稿しました',
        data: data.data,
      });
    }

    // エラーレスポンスの処理
    logger.error('ガールズまとめAPI error response:', data);

    if (response.status === 401 || response.status === 403) {
      throw new Error('認証エラー: APIキーが正しくありません');
    }

    throw new Error(`ガールズまとめAPIエラー: ${response.status} - ${data.error || 'Unknown error'}`);
  } catch (error) {
    logger.error('Error posting to girls-matome:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: errorMessage.includes('認証エラー')
          ? errorMessage
          : 'ガールズまとめ速報への投稿に失敗しました',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
