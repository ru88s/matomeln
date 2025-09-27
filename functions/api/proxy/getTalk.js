export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Talk ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`https://shikutoku.me/api/getTalk?talk_id=${id}`, {
      headers: {
        'User-Agent': 'ShikuMato/1.0',
        'x-api-key': 'n8I6nXExVl',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching talk:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch talk', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}