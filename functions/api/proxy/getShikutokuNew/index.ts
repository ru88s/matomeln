/**
 * Shikutoku未まとめURL取得API（スレメモくん経由）
 */

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://matomeln.com', 'http://localhost:3000', 'http://localhost:3001'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://matomeln.com';
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequest(context: { request: Request }) {
  const { request } = context;
  const corsHeaders = getCorsHeaders(request);

  // OPTIONSリクエスト（CORS preflight）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Shikutoku is no longer supported', urls: [], count: 0 }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}
