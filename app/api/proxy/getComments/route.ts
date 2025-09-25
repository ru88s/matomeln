import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const talk_id = searchParams.get('talk_id');
  const page = searchParams.get('page') || '1';

  if (!talk_id) {
    return NextResponse.json({ error: 'Talk ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://shikutoku.me/api/getComments?talk_id=${talk_id}&page=${page}`,
      {
        headers: {
          'User-Agent': 'ShikuMato/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}