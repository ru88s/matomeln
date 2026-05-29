export async function onRequest(context) {
  return new Response(JSON.stringify({ error: 'Shikutoku is no longer supported' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
