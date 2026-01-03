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

// XML制御文字と孤立サロゲートを除去
function removeXmlInvalidChars(str) {
  // XML 1.0で許可されている文字: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
  // eslint-disable-next-line no-control-regex
  let result = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 孤立サロゲートを除去（U+D800-U+DFFF）
  // 正しいサロゲートペアは残し、孤立したものだけ除去
  let cleaned = '';
  for (let i = 0; i < result.length; i++) {
    const code = result.charCodeAt(i);
    // 高サロゲート（U+D800-U+DBFF）
    if (code >= 0xD800 && code <= 0xDBFF) {
      if (i + 1 < result.length) {
        const nextCode = result.charCodeAt(i + 1);
        // 次が低サロゲートなら正しいペア
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          cleaned += result[i] + result[i + 1];
          i++;
          continue;
        }
      }
      // 孤立した高サロゲートはスキップ
      continue;
    }
    // 孤立した低サロゲート（U+DC00-U+DFFF）はスキップ
    if (code >= 0xDC00 && code <= 0xDFFF) {
      continue;
    }
    cleaned += result[i];
  }
  return cleaned;
}

// CDATA内の]]>をエスケープ
function escapeCDATA(str) {
  return str.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

// XMLエスケープ
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// AtomPub用XMLペイロードを生成
function buildAtomXml(title, body) {
  // タイトルと本文から制御文字を除去
  const cleanTitle = removeXmlInvalidChars(title);
  const cleanBody = removeXmlInvalidChars(body);

  // タイトルはエスケープ
  const escapedTitle = escapeXml(cleanTitle);

  // <!--more-->タグで本文と続きを分割
  const parts = cleanBody.split('<!--more-->');
  const mainBody = parts[0] || '';
  const moreBody = parts[1] || '';

  // blogcms:body/moreはCDATAを使用（HTMLタグを含むため）
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" xmlns:blogcms="http://blogcms.jp/-/spec/atompub/1.0/">' +
    '<title>' + escapedTitle + '</title>' +
    '<content type="text/html" xml:lang="ja">' + escapeXml(cleanBody) + '</content>' +
    '<blogcms:source><blogcms:body><![CDATA[' + escapeCDATA(mainBody) + ']]></blogcms:body>' +
    '<blogcms:more><![CDATA[' + escapeCDATA(moreBody) + ']]></blogcms:more></blogcms:source>' +
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

    // デバッグ: サイズをログ出力
    console.log(`📝 投稿データ: タイトル=${title.length}文字, 本文=${body.length}文字, XML=${xmlPayload.length}文字`);

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

    // デバッグ: エラー時のXMLの先頭500文字をログ出力
    console.log(`❌ エラー時のXML先頭: ${xmlPayload.substring(0, 500)}`);
    console.log(`❌ エラーレスポンス: ${response.status} - ${responseText}`);

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