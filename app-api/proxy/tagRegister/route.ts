import { NextRequest, NextResponse } from 'next/server';

const THREAD_MEMO_BASE_URL = 'https://thread-memo.starcrown.co.jp';

async function jsonFromResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `HTTP ${response.status}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      target?: string;
      tag?: string;
      thumbnail_url?: string | null;
    };
    const { target, tag, thumbnail_url } = body;

    if (!target || !tag) {
      return NextResponse.json({ error: 'target and tag are required' }, { status: 400 });
    }

    const response = await fetch(`${THREAD_MEMO_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, tag, thumbnail_url: thumbnail_url || null }),
    });

    const data = await jsonFromResponse(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
