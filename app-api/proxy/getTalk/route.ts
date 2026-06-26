import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Shikutoku is no longer supported' },
    { status: 410 }
  );
}
