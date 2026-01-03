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

// XML制御文字を除去（XML 1.0で許可されていない文字）
function removeXmlInvalidChars(str) {
  // XML 1.0で許可されている文字: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// CDATA内の]]>をエスケープ
function escapeCDATA(str) {
  return str.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

// AtomPub用XMLペイロードを生成
function buildAtomXml(title, body) {
  // タイトルから制御文字を除去してエスケープ
  const cleanTitle = removeXmlInvalidChars(title);
  const escapedTitle = cleanTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // 本文から制御文字を除去
  const cleanBody = removeXmlInvalidChars(body);

  // <!--more-->タグで本文と続きを分割
  const parts = cleanBody.split('<!--more-->');
  const mainBody = escapeCDATA(parts[0] || '');
  const moreBody = escapeCDATA(parts[1] || '');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" xmlns:blogcms="http://blogcms.jp/-/spec/atompub/1.0/">' +
    '<title>' + escapedTitle + '</title>' +
    '<content type="text/html" xml:lang="ja"><![CDATA[' + escapeCDATA(cleanBody) + ']]></content>' +
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
    const requestData = await context.request.json();

    const { blogId, apiKey, title, body, draft } = requestData;

    if (!blogId || !apiKey || !title || !body) {
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

    // ライブドアブログAPIへPOST（20秒タイムアウト）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'WSSE profile="UsernameToken"',
          'X-WSSE': wsseHeader,
          'Content-Type': 'application/xml',
        },
        body: xmlPayload,
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('ライブドアブログAPIがタイムアウトしました（20秒）');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    // 成功の場合、Locationヘッダーから記事URLを取得
    const location = response.headers.get('location');

    if (response.status === 201 && location) {
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

    // 401の場合は認証エラー
    if (response.status === 401) {
      throw new Error('認証エラー: ブログIDまたはAPIキーが正しくありません');
    }

    throw new Error(`ライブドアブログAPIエラー: ${response.status} - ${responseText}`);
  } catch (error) {
    // エラーメッセージをそのまま返す（詳細情報を含める）
    const errorMessage = error.message || 'ライブドアブログへの投稿に失敗しました';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorMessage
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