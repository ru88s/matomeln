import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const errorMessages: Record<number, string> = {
  400: '無効なリクエストです',
  404: 'トークが見つかりません',
  429: 'リクエスト制限に達しました。少し待ってからお試しください',
  500: 'サーバーエラーが発生しました',
  503: 'サービスが一時的に利用できません',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const talk_id = searchParams.get('talk_id');
  let page = searchParams.get('page') || '1-50';

  // ページ番号のみが渡された場合は範囲形式に変換
  if (!page.includes('-')) {
    const pageNum = parseInt(page) || 1;
    const from = (pageNum - 1) * 50 + 1;
    const to = pageNum * 50;
    page = `${from}-${to}`;
  }

  if (!talk_id) {
    return NextResponse.json(
      { error: 'トークIDが指定されていません' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://shikutoku.me/api/getComments?talk_id=${talk_id}&page=${page}`,
      {
        headers: {
          'User-Agent': 'ShikuMato/1.0',
          'x-api-key': 'n8I6nXExVl',
        },
      }
    );

    const data = await response.json() as { error?: string; [key: string]: unknown };

    // APIが404を返す場合でも、エラーメッセージを適切に返す
    if (!response.ok) {
      // "Talk not found"の場合は404として扱う
      if (response.status === 404 || (data.error && data.error.includes('not found'))) {
        return NextResponse.json(
          {
            error: 'トークが見つかりません',
            success: false,
            data: null
          },
          { status: 404 }
        );
      }
      // その他のエラーは元のステータスコードを保持
      const errorMessage = errorMessages[response.status] || `エラーが発生しました (${response.status})`;
      return NextResponse.json(
        {
          error: errorMessage,
          success: false,
          data: null
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'コメントの取得に失敗しました。ネットワーク接続を確認してください' },
      { status: 500 }
    );
  }
}