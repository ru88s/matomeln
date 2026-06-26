import { NextRequest, NextResponse } from 'next/server';

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const globalMemoStore = globalThis as typeof globalThis & {
  __matomelnSkippedUrls?: Set<string>;
};

function getSkippedUrls(): Set<string> {
  if (!globalMemoStore.__matomelnSkippedUrls) {
    globalMemoStore.__matomelnSkippedUrls = new Set<string>();
  }
  return globalMemoStore.__matomelnSkippedUrls;
}

function normalizeThreadMemoUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

async function markSkippedExternally(url: string, reason: string): Promise<Response> {
  const skipResponse = await fetch(`${THREAD_MEMO_BASE_URL}/api/threads/mark-skipped`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ url, reason }),
  });

  if (skipResponse.status !== 404 && skipResponse.status !== 405) {
    return skipResponse;
  }

  return fetch(`${THREAD_MEMO_BASE_URL}/api/threads/mark-summarized`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ url }),
  });
}

export async function POST(request: NextRequest) {
  const { url, reason = '' } = await request.json().catch(() => ({ url: '' })) as { url?: string; reason?: string };

  if (!url) {
    return NextResponse.json(
      { error: 'URL is required' },
      { status: 400 }
    );
  }

  const normalizedUrl = normalizeThreadMemoUrl(url);
  getSkippedUrls().add(url);
  getSkippedUrls().add(normalizedUrl);

  const response = await markSkippedExternally(normalizedUrl, reason);
  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `HTTP ${response.status}: ${errorText}` },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
