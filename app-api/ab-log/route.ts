import { NextResponse } from 'next/server';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// A/Bテスト（quality-v1）の記事別バリアントを JSONL で記録する（ローカル dev 専用）。
// 出力: <repo>/data/ab-test/quality-v1/<YYYY-MM-DD>.jsonl（JST日付, gitignore 済み）
function isLocalDevRequest(request: Request): boolean {
  const host = request.headers.get('host') || '';
  return process.env.NODE_ENV === 'development' || host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
}

const ALLOWED_KEYS = ['experiment', 'site', 'variant', 'title', 'original_title', 'title_source', 'article_url', 'article_id', 'thread_url', 'note'];

export async function POST(request: Request) {
  if (!isLocalDevRequest(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 3600 * 1000);
    const date = jst.toISOString().slice(0, 10);
    const record: Record<string, unknown> = { ts: jst.toISOString().replace('Z', '+09:00'), date };
    for (const key of ALLOWED_KEYS) {
      const v = body[key];
      if (typeof v === 'string' || v === null) record[key] = typeof v === 'string' ? v.slice(0, 500) : v;
    }
    const dir = path.join(process.cwd(), 'data', 'ab-test', 'quality-v1');
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, `${date}.jsonl`), JSON.stringify(record) + '\n', 'utf8');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
