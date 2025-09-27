export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { blogId, apiKey, title, body, draft } = await context.request.json();

    if (!blogId || !apiKey || !title || !body) {
      return new Response(
        JSON.stringify({ error: '必須パラメータが不足しています' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // はてなブログAPIのエンドポイント
    const endpoint = `https://blog.hatena.ne.jp/${blogId}/${blogId}.hatenablog.com/atom/entry`;

    // XMLペイロードの作成
    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title>${title}</title>
  <author><name>${blogId}</name></author>
  <content type="text/x-markdown">${body}</content>
  ${draft ? '<app:control><app:draft>yes</app:draft></app:control>' : ''}
</entry>`;

    // はてなブログAPIへPOST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-HATENA-PUBLISH-KEY': apiKey,
      },
      body: xmlPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hatena API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();

    // XMLレスポンスからURLを抽出
    const urlMatch = responseText.match(/<link rel="alternate" type="text\/html" href="([^"]+)"/);
    const publishedUrl = urlMatch ? urlMatch[1] : null;

    return new Response(JSON.stringify({
      success: true,
      message: draft ? 'ブログ記事を下書きとして保存しました' : 'ブログ記事を公開しました',
      url: publishedUrl
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error posting to blog:', error);
    return new Response(
      JSON.stringify({ error: 'ブログ投稿に失敗しました', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}