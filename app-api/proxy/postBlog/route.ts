import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// WSSE認証ヘッダーを生成
function generateWSSEHeader(username: string, password: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const created = new Date().toISOString();

  // パスワードダイジェストの生成
  const digest = crypto
    .createHash('sha1')
    .update(nonce + created + password)
    .digest('base64');

  // nonceをBase64エンコード
  const nonceBase64 = Buffer.from(nonce).toString('base64');

  return `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
}

// AtomPub用XMLペイロードを生成
function buildAtomXml(title: string, body: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // <!--more-->タグで本文と続きを分割
  const parts = body.split('<!--more-->');
  const mainBody = parts[0] || '';
  const moreBody = parts[1] || '';

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" xmlns:blogcms="http://blogcms.jp/-/spec/atompub/1.0/">' +
    '<title>' + escapedTitle + '</title>' +
    '<content type="text/html" xml:lang="ja">' + body + '</content>' +
    '<blogcms:source><blogcms:body><![CDATA[' + mainBody + ']]></blogcms:body>' +
    '<blogcms:more><![CDATA[' + moreBody + ']]></blogcms:more></blogcms:source>' +
    '</entry>'
  );
}

export async function POST(request: NextRequest) {
  try {
    const { blogId, apiKey, title, body, draft } = await request.json();

    if (!blogId || !apiKey || !title || !body) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // ライブドアブログのAtomPub APIエンドポイント
    const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/article`;

    // WSSE認証ヘッダーを生成
    const wsseHeader = generateWSSEHeader(blogId, apiKey);

    // AtomPub用XMLペイロードを生成
    const xmlPayload = buildAtomXml(title, body);

    logger.log('API endpoint:', endpoint);
    logger.log('Blog ID:', blogId);
    logger.log('WSSE Header:', wsseHeader);
    logger.log('XML Payload (first 500 chars):', xmlPayload.substring(0, 500));

    // ライブドアブログAPIへPOST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'WSSE profile="UsernameToken"',
        'X-WSSE': wsseHeader,
        'Content-Type': 'application/xml',
      },
      body: xmlPayload,
    });

    logger.log('Response status:', response.status);
    logger.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // 成功の場合、Locationヘッダーから記事URLを取得
    const location = response.headers.get('location');

    if (response.status === 201 && location) {
      logger.log('投稿成功:', location);

      return NextResponse.json({
        success: true,
        message: 'ブログ記事を投稿しました',
        url: location,
      });
    }

    // エラーレスポンスの処理
    const responseText = await response.text();
    logger.error('Livedoor API error response:', responseText);

    // 401の場合は認証エラー
    if (response.status === 401) {
      throw new Error('認証エラー: ブログIDまたはAPIキーが正しくありません');
    }

    throw new Error(`ライブドアブログAPIエラー: ${response.status} - ${responseText}`);
  } catch (error) {
    logger.error('Error posting to blog:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: errorMessage.includes('認証エラー')
          ? errorMessage
          : 'ライブドアブログへの投稿に失敗しました',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}