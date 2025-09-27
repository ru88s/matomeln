export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const talk_id = searchParams.get('talk_id');
  let page = searchParams.get('page') || '1-50';

  // ページ番号のみが渡された場合は範囲形式に変換
  if (!page.includes('-')) {
    const pageNum = parseInt(page) || 1;
    const from = (pageNum - 1) * 50 + 1;
    const to = pageNum * 50;
    page = `${from}-${to}`;
  }

  if (!talk_id) {
    return new Response(JSON.stringify({ error: 'Talk ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(
      `https://shikutoku.me/api/getComments?talk_id=${talk_id}&page=${page}`,
      {
        headers: {
          'User-Agent': 'ShikuMato/1.0',
          'x-api-key': 'n8I6nXExVl',
        },
      }
    );

    const data = await response.json();

    // APIが404を返す場合でも、エラーメッセージを適切に返す
    if (!response.ok) {
      // "Talk not found"の場合は404として扱う
      if (response.status === 404 || (data.error && data.error.includes('not found'))) {
        return new Response(JSON.stringify({
          error: data.error || 'Talk not found',
          success: false,
          data: null
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // その他のエラーは元のステータスコードを保持
      return new Response(JSON.stringify({
        error: data.error || `HTTP error! status: ${response.status}`,
        success: false,
        data: null
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch comments', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}