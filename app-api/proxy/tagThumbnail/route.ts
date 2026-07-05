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
      tagId?: string;
      thumbnailUrl?: string;
    };
    const { tagId, thumbnailUrl } = body;

    if (!tagId || !thumbnailUrl) {
      return NextResponse.json({ error: 'tagId and thumbnailUrl are required' }, { status: 400 });
    }

    const response = await fetch(`${THREAD_MEMO_BASE_URL}/api/tags/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, thumbnailUrl }),
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
