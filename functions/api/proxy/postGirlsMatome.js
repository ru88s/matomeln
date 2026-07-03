// HTML本文から抜粋を生成
function generateExcerpt(body, maxLength = 200) {
  // HTMLタグを除去
  let text = body.replace(/<[^>]*>/g, '');
  // 空白を正規化
  text = text.replace(/\s+/g, ' ').trim();
  // 指定文字数で切り詰め
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
}

// タイトルからスラッグを生成
function generateSlug(title) {
  // 日本語タイトルからスラッグを生成
  // 英数字のみ抽出し、スペースをハイフンに
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  // 空の場合はランダムな文字列
  if (!slug) {
    return 'post-' + Date.now().toString(36);
  }
  return slug;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    const requestData = await context.request.json();
    const { apiUrl, apiKey, title, body, sourceUrl, tags, thumbnailUrl, thumbnailBase64 } = requestData;

    if (!apiUrl || !apiKey || !title || !body) {
      return new Response(
        JSON.stringify({
          error: '必須パラメータが不足しています',
          missing: {
            apiUrl: !apiUrl,
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

    // APIベースURLを構築
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

    // サムネイルをアップロード（指定されている場合）
    let uploadedThumbnailUrl = null;

    // base64サムネイルがある場合（AI生成サムネイル）
    if (thumbnailBase64) {
      try {
        console.log(`📷 Base64サムネイルアップロード開始`);

        // Base64をBlobに変換
        const binary = atob(thumbnailBase64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: 'image/png' });

        // FormDataで送信
        const formData = new FormData();
        formData.append('file', blob, `ai-thumbnail-${Date.now()}.png`);

        const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.data?.url) {
            uploadedThumbnailUrl = uploadData.data.url;
            console.log(`✅ Base64サムネイルアップロード成功: ${uploadedThumbnailUrl}`);
          }
        } else {
          console.log(`⚠️ Base64サムネイルアップロード失敗: ${uploadResponse.status}`);
        }
      } catch (uploadError) {
        console.log(`⚠️ Base64サムネイルアップロードエラー: ${uploadError.message}`);
      }
    }
    // URLサムネイルがある場合（既存画像URL）
    else if (thumbnailUrl) {
      try {
        console.log(`📷 URLサムネイルアップロード開始: ${thumbnailUrl}`);
        const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({ imageUrl: thumbnailUrl }),
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.data?.url) {
            uploadedThumbnailUrl = uploadData.data.url;
            console.log(`✅ URLサムネイルアップロード成功: ${uploadedThumbnailUrl}`);
          }
        } else {
          console.log(`⚠️ URLサムネイルアップロード失敗: ${uploadResponse.status}`);
        }
      } catch (uploadError) {
        console.log(`⚠️ URLサムネイルアップロードエラー: ${uploadError.message}`);
      }
    }

    // スラッグと抜粋を生成
    const slug = generateSlug(title);
    const excerpt = generateExcerpt(body);

    // タグを文字列に（カンマ区切り）
    const tagsString = tags || '';

    // ガールズまとめ速報APIへPOST
    const response = await fetch(`${baseUrl}/api/posts/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        title: title,
        slug: slug,
        body_html: body,
        excerpt: excerpt,
        thumbnail_url: uploadedThumbnailUrl,
        source_url: sourceUrl || '',
        tags: tagsString,
      }),
    });

    const responseData = await readJsonResponse(response);

    if (!response.ok) {
      const errorMessage = responseData.error || 'ガールズまとめ速報への投稿に失敗しました';
      console.log(`❌ girls-matome API error: ${response.status} - ${errorMessage}`);
      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: responseData
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log(`✅ girls-matome投稿成功: ${title}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ガールズまとめ速報に投稿しました',
        postId: responseData.id,
        data: responseData
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('postGirlsMatome error:', error);
    const message = error && error.message ? error.message : String(error);
    const details = message === 'fetch failed'
      ? `ガールズまとめ速報APIへの接続に失敗しました: ${message}`
      : message;
    return new Response(
      JSON.stringify({
        error: details,
        details
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
