// WSSE認証ヘッダーを生成（Web Crypto API版）
async function generateWSSEHeader(username, password) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const created = new Date().toISOString();

  // パスワードダイジェストの生成
  const encoder = new TextEncoder();
  const data = encoder.encode(nonce + created + password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const digest = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // nonceをBase64エンコード
  const nonceBase64 = btoa(nonce);

  return `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
}

export async function onRequest(context) {
  // CORS headers（許可するオリジンを制限）
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS request for CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const formData = await context.request.formData();
    const blogId = formData.get('blogId');
    const apiKey = formData.get('apiKey');
    const file = formData.get('file');

    if (!blogId || !apiKey || !file) {
      return new Response(
        JSON.stringify({
          error: '必須パラメータが不足しています',
          missing: {
            blogId: !blogId,
            apiKey: !apiKey,
            file: !file
          }
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // ファイルをArrayBufferとして読み込み
    const arrayBuffer = await file.arrayBuffer();

    // ライブドアブログの画像アップロードAPIエンドポイント
    const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/image`;

    // WSSE認証ヘッダーを生成
    const wsseHeader = await generateWSSEHeader(blogId, apiKey);

    // Content-Typeを取得（デフォルトはjpeg）
    const contentType = file.type || 'image/jpeg';

    // ライブドアブログAPIへPOST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'WSSE profile="UsernameToken"',
        'X-WSSE': wsseHeader,
        'Content-Type': contentType,
        'Slug': encodeURIComponent(file.name),
      },
      body: arrayBuffer,
    });

    // 成功の場合、レスポンスXMLから画像URLを取得
    if (response.status === 201) {
      const responseText = await response.text();

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
        return new Response(JSON.stringify({
          success: true,
          message: '画像をアップロードしました',
          url: finalUrl,
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // URLが見つからない場合はレスポンス全体を返す
      return new Response(JSON.stringify({
        success: true,
        message: '画像をアップロードしましたが、URLの取得に失敗しました',
        rawResponse: responseText,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // エラーレスポンスの処理
    const responseText = await response.text();

    // 401の場合は認証エラー
    if (response.status === 401) {
      throw new Error('認証エラー: ブログIDまたはAPIキーが正しくありません');
    }

    throw new Error(`ライブドアブログAPIエラー: ${response.status} - ${responseText}`);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message.includes('認証エラー')
          ? error.message
          : '画像のアップロードに失敗しました',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}
