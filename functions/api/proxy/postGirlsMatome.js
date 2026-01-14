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

export async function onRequest(context) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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
    const { apiUrl, apiKey, title, body, sourceUrl, tags } = requestData;

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

    // APIエンドポイントを構築
    const endpoint = apiUrl.endsWith('/')
      ? `${apiUrl}api/posts/import`
      : `${apiUrl}/api/posts/import`;

    // スラッグと抜粋を生成
    const slug = generateSlug(title);
    const excerpt = generateExcerpt(body);

    // タグを文字列に（カンマ区切り）
    const tagsString = tags || '';

    // ガールズまとめ速報APIへPOST
    const response = await fetch(endpoint, {
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
        source_url: sourceUrl || '',
        tags: tagsString,
      }),
    });

    const responseData = await response.json();

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
    return new Response(
      JSON.stringify({
        error: error.message || 'ガールズまとめ速報への投稿に失敗しました',
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
