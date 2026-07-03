import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type BlogType = 'livedoor' | 'girls-matome' | 'kotoria';

interface TestBlogRequest {
  blogId: string;
  apiUsername?: string;
  apiKey: string;
  blogType?: BlogType;
}

function generateWSSEHeader(username: string, password: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const created = new Date().toISOString();
  const digest = crypto
    .createHash('sha1')
    .update(nonce + created + password)
    .digest('base64');
  const nonceBase64 = Buffer.from(nonce).toString('base64');

  return `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
}

async function testLivedoorBlog(blogId: string, apiUsername: string | undefined, apiKey: string) {
  const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/article`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: 'WSSE profile="UsernameToken"',
      'X-WSSE': generateWSSEHeader(apiUsername || blogId, apiKey),
      Accept: 'application/atom+xml,application/xml,text/xml,*/*',
    },
  });

  if (response.ok) {
    return { ok: true, status: 'normal', message: '正常', httpStatus: response.status };
  }

  const body = await response.text().catch(() => '');
  if (response.status === 401) {
    return { ok: false, status: 'auth_error', message: '認証NG', httpStatus: response.status, details: body };
  }
  if (response.status === 403) {
    return { ok: false, status: 'permission_error', message: '権限NG', httpStatus: response.status, details: body };
  }
  if (response.status === 404) {
    return { ok: false, status: 'not_found', message: 'ブログIDなし', httpStatus: response.status, details: body };
  }

  return { ok: false, status: 'api_error', message: `APIエラー ${response.status}`, httpStatus: response.status, details: body };
}

async function testHttpApi(apiUrl: string, apiKey: string, blogType: BlogType) {
  const baseUrl = apiUrl.replace(/\/$/, '');
  const response = await fetch(baseUrl, {
    method: 'GET',
    headers: blogType === 'kotoria'
      ? { Authorization: `Bearer ${apiKey}` }
      : { 'X-API-Key': apiKey },
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 'auth_error', message: '認証NG', httpStatus: response.status };
  }
  if (response.status === 404) {
    return { ok: false, status: 'not_found', message: 'URLなし', httpStatus: response.status };
  }

  return {
    ok: response.status < 500,
    status: response.status < 500 ? 'reachable' : 'api_error',
    message: response.status < 500 ? '接続OK' : `接続NG ${response.status}`,
    httpStatus: response.status,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { blogId, apiUsername, apiKey, blogType = 'livedoor' } = await request.json() as TestBlogRequest;

    if (!blogId || !apiKey) {
      return NextResponse.json(
        { ok: false, status: 'missing_params', message: '設定不足' },
        { status: 400 }
      );
    }

    const result = blogType === 'livedoor'
      ? await testLivedoorBlog(blogId, apiUsername, apiKey)
      : await testHttpApi(blogId, apiKey, blogType);

    return NextResponse.json(result, { status: result.ok ? 200 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { ok: false, status: 'connection_error', message: '接続NG', details: message },
      { status: 200 }
    );
  }
}
