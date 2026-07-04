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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';

  try {
    const params = new URLSearchParams();
    if (title) params.append('title', title);

    const response = await fetch(`${THREAD_MEMO_BASE_URL}/api/thumbnails?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action?: string;
      id?: string;
      title?: string;
      imageUrl?: string;
      category?: string;
      keywords?: string[];
      style?: string;
    };
    const endpoint = body.action === 'use' ? '/api/thumbnails/use' : '/api/thumbnails';
    const payload = body.action === 'use'
      ? { id: body.id }
      : {
          title: body.title,
          imageUrl: body.imageUrl,
          category: body.category,
          keywords: body.keywords,
          style: body.style,
        };

    const response = await fetch(`${THREAD_MEMO_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
