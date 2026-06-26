import { NextResponse } from 'next/server';

function isLocalDevRequest(request: Request): boolean {
  const host = request.headers.get('host') || '';
  return (
    process.env.NODE_ENV === 'development' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:')
  );
}

export async function GET(request: Request) {
  if (!isLocalDevRequest(request)) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: 'local-dev-admin',
      email: 'local-dev@matomeln.local',
      name: 'Local Dev',
      image: null,
      role: 'admin',
    },
  });
}
