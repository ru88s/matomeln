import { NextRequest, NextResponse } from 'next/server';

/**
 * thread-memo API プロキシ
 * 未まとめURL取得・まとめ済み登録
 */

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';
const THREAD_MEMO_WORKERS_URL = 'https://thread-memo.w-yonamine.workers.dev';

// 未まとめURL取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';
  const lifeOnly = searchParams.get('lifeOnly') === 'true';
  const limit = searchParams.get('limit') || '1000';

  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (lifeOnly) params.append('lifeOnly', 'true');
    params.append('limit', limit);

    const response = await fetch(
      `${THREAD_MEMO_BASE_URL}/api/threads/unsummarized?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// まとめ済み登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${THREAD_MEMO_WORKERS_URL}/api/threads/mark-summarized`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
