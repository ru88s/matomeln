import { NextRequest, NextResponse } from 'next/server';

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get('limit') || '1000';

  try {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('source', 'girlschannel');

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

    const data = await response.json() as { urls?: string[]; count?: number };
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const filteredUrls = urls.filter((url) => url.includes('girlschannel.net'));

    return NextResponse.json({
      urls: filteredUrls,
      count: filteredUrls.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
