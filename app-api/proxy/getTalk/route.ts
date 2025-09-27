import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Talk ID is required' },
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching talk:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}