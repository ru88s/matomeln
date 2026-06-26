import { NextResponse } from 'next/server';

function isLocalDevRequest(request: Request): boolean {
  const host = request.headers.get('host') || '';
  return (
    process.env.NODE_ENV === 'development' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:')
  );
}

export async function POST(request: Request) {
  if (!isLocalDevRequest(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
