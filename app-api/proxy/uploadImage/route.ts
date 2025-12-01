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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const blogId = formData.get('blogId') as string;
    const apiKey = formData.get('apiKey') as string;
    const file = formData.get('file') as File;

    if (!blogId || !apiKey || !file) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // ファイルをArrayBufferとして読み込み
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ライブドアブログの画像アップロードAPIエンドポイント
    const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/image`;

    // WSSE認証ヘッダーを生成
    const wsseHeader = generateWSSEHeader(blogId, apiKey);

    // Content-Typeを取得（デフォルトはjpeg）
    const contentType = file.type || 'image/jpeg';

    logger.log('Uploading image to:', endpoint);
    logger.log('File name:', file.name);
    logger.log('File size:', buffer.length);
    logger.log('Content-Type:', contentType);

    // ライブドアブログAPIへPOST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'WSSE profile="UsernameToken"',
        'X-WSSE': wsseHeader,
        'Content-Type': contentType,
        'Slug': encodeURIComponent(file.name),
      },
      body: buffer,
    });

    logger.log('Response status:', response.status);

    // 成功の場合、レスポンスXMLから画像URLを取得
    if (response.status === 201) {
      const responseText = await response.text();
      logger.log('Upload success response:', responseText);

      // XMLから画像URLを抽出
      // <link rel="alternate" href="画像URL" /> を探す
      const linkMatch = responseText.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/);
      const imageUrl = linkMatch ? linkMatch[1] : null;

      // もしくは <id>タグからURLを取得
      const idMatch = responseText.match(/<id>([^<]+)<\/id>/);
      const idUrl = idMatch ? idMatch[1] : null;

      // content srcからも試す
      const contentMatch = responseText.match(/<content[^>]*src="([^"]+)"[^>]*\/?>/);
      const contentUrl = contentMatch ? contentMatch[1] : null;

      const finalUrl = imageUrl || contentUrl || idUrl;

      if (finalUrl) {
        return NextResponse.json({
          success: true,
          message: '画像をアップロードしました',
          url: finalUrl,
        });
      }

      // URLが見つからない場合はレスポンス全体を返す
      return NextResponse.json({
        success: true,
        message: '画像をアップロードしましたが、URLの取得に失敗しました',
        rawResponse: responseText,
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
    logger.error('Error uploading image:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: errorMessage.includes('認証エラー')
          ? errorMessage
          : '画像のアップロードに失敗しました',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
