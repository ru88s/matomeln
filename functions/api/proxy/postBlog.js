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

// AtomPub用XMLペイロードを生成
function buildAtomXml(title, body) {
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

export async function onRequest(context) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
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
    console.log('PostBlog request received:', context.request.method);
    const requestData = await context.request.json();
    console.log('Request data keys:', Object.keys(requestData));

    const { blogId, apiKey, title, body, draft } = requestData;

    if (!blogId || !apiKey || !title || !body) {
      console.error('Missing required parameters:', {
        blogId: !!blogId,
        apiKey: !!apiKey,
        title: !!title,
        body: !!body
      });
      return new Response(
        JSON.stringify({
          error: '必須パラメータが不足しています',
          missing: {
            blogId: !blogId,
            apiKey: !apiKey,
            title: !title,
            body: !body
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

    // ライブドアブログのAtomPub APIエンドポイント
    const endpoint = `https://livedoor.blogcms.jp/atom/blog/${blogId}/article`;

    // WSSE認証ヘッダーを生成
    const wsseHeader = await generateWSSEHeader(blogId, apiKey);

    // AtomPub用XMLペイロードを生成
    const xmlPayload = buildAtomXml(title, body);

    console.log('Calling Livedoor API with endpoint:', endpoint);
    console.log('WSSE Header:', wsseHeader);

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

    console.log('Livedoor API response status:', response.status);

    // 成功の場合、Locationヘッダーから記事URLを取得
    const location = response.headers.get('location');

    if (response.status === 201 && location) {
      console.log('投稿成功:', location);

      return new Response(JSON.stringify({
        success: true,
        message: 'ブログ記事を投稿しました',
        url: location,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // エラーレスポンスの処理
    const responseText = await response.text();
    console.error('Livedoor API error:', {
      status: response.status,
      error: responseText,
      endpoint: endpoint
    });

    // 401の場合は認証エラー
    if (response.status === 401) {
      throw new Error('認証エラー: ブログIDまたはAPIキーが正しくありません');
    }

    throw new Error(`ライブドアブログAPIエラー: ${response.status} - ${responseText}`);
  } catch (error) {
    console.error('Error posting to blog:', error);
    return new Response(
      JSON.stringify({
        error: error.message.includes('認証エラー')
          ? error.message
          : 'ライブドアブログへの投稿に失敗しました',
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