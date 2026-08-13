import { NextRequest, NextResponse } from 'next/server';

/**
 * thread-memo API プロキシ
 * 未まとめURL取得・まとめ済み登録
 */

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const globalMemoStore = globalThis as typeof globalThis & {
  __matomelnSummarizedUrls?: Set<string>;
  __matomelnSkippedUrls?: Set<string>;
};

function getSummarizedUrls(): Set<string> {
  if (!globalMemoStore.__matomelnSummarizedUrls) {
    globalMemoStore.__matomelnSummarizedUrls = new Set<string>();
  }
  return globalMemoStore.__matomelnSummarizedUrls;
}

function getSkippedUrls(): Set<string> {
  if (!globalMemoStore.__matomelnSkippedUrls) {
    globalMemoStore.__matomelnSkippedUrls = new Set<string>();
  }
  return globalMemoStore.__matomelnSkippedUrls;
}

function normalizeThreadMemoUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function filterUrlsBySource(urls: string[], source: string): string[] {
  const isTalkUrl = (url: string) => /talk\.jp\/boards\//i.test(url);
  const isGirlsChannelUrl = (url: string) => /girlschannel\.net\/topics\//i.test(url);

  if (source === 'talk') return urls.filter(isTalkUrl);
  if (source === '5ch') return urls.filter((url) => !isTalkUrl(url) && !isGirlsChannelUrl(url));
  return urls;
}

// 未まとめURL取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';
  const lifeOnly = searchParams.get('lifeOnly') === 'true';
  const source = searchParams.get('source') || '';
  const limit = searchParams.get('limit') || '1000';

  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (lifeOnly) params.append('lifeOnly', 'true');
    if (source === '5ch' || source === 'talk') params.append('source', source);
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

    const data = await response.json() as { urls?: string[]; count?: number };
    if (Array.isArray(data.urls)) {
      data.urls = filterUrlsBySource(data.urls, source);
      const summarized = getSummarizedUrls();
      const skipped = getSkippedUrls();
      data.urls = data.urls.filter((url: string) => {
        const normalizedUrl = normalizeThreadMemoUrl(url);
        return !summarized.has(url) && !summarized.has(normalizedUrl) && !skipped.has(url) && !skipped.has(normalizedUrl);
      });
      data.count = data.urls.length;
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface MarkSummarizedRequest {
  url: string;
}

// まとめ済み登録
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as MarkSummarizedRequest;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeThreadMemoUrl(url);

    const response = await fetch(
      `${THREAD_MEMO_BASE_URL}/api/threads/mark-summarized`,
      {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ url: normalizedUrl }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    getSummarizedUrls().add(url);
    getSummarizedUrls().add(normalizedUrl);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
