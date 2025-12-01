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
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'トークIDが指定されていません' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://shikutoku.me/api/getTalk?talk_id=${id}`, {
      headers: {
        'User-Agent': 'ShikuMato/1.0',
        'x-api-key': 'n8I6nXExVl',
      },
    });

    if (!response.ok) {
      const errorMessage = errorMessages[response.status] || `エラーが発生しました (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching talk:', error);
    return NextResponse.json(
      { error: 'トークの取得に失敗しました。ネットワーク接続を確認してください' },
      { status: 500 }
    );
  }
}