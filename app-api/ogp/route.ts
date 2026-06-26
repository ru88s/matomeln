import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface OgpData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

const OGP_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 256 * 1024;
const CACHE_TTL_MS = 60 * 60 * 1000;
const ogpCache = new Map<string, { expiresAt: number; data: OgpData }>();
const inFlightRequests = new Map<string, Promise<OgpData>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  const cached = ogpCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const inFlight = inFlightRequests.get(url);
  if (inFlight) {
    return NextResponse.json(await inFlight);
  }

  const ogpPromise = fetchOgp(url);
  inFlightRequests.set(url, ogpPromise);

  try {
    const data = await ogpPromise;
    ogpCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, data });
    return NextResponse.json(data);
  } finally {
    inFlightRequests.delete(url);
  }
}

async function fetchOgp(url: string): Promise<OgpData> {
  if (isLikelyDirectMediaUrl(url)) {
    logger.warn(`OGP fetch skipped direct media URL: ${url}`);
    return emptyOgpData(url);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OGP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShikumatoBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(`OGP fetch skipped: ${response.status} ${url}`);
      return emptyOgpData(url);
    }

    // Content-Typeヘッダーから文字コードを取得
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      logger.warn(`OGP fetch skipped non-html: ${contentType} ${url}`);
      return emptyOgpData(url);
    }

    // HTMLだけを上限付きで読む。画像・動画URLを丸ごと読まないための保険。
    const buffer = await readLimitedArrayBuffer(response, MAX_HTML_BYTES);
    const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
    let charset = charsetMatch ? normalizeCharset(charsetMatch[1]) : 'utf-8';

    // HTMLから文字コードを検出（metaタグから）
    if (!charsetMatch) {
      const preliminaryHtml = new TextDecoder('utf-8').decode(buffer.slice(0, 2000));
      const metaCharset = preliminaryHtml.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
      if (metaCharset) {
        charset = normalizeCharset(metaCharset[1]);
      }
    }

    // 文字コードの正規化
    const normalizedCharset = normalizeCharset(charset);

    // デコード
    const html = new TextDecoder(normalizedCharset).decode(buffer);

    // OGPタグを抽出
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || '';
    const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] || '';
    const ogSiteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i)?.[1] || '';

    // フォールバック: titleタグ
    const title = ogTitle || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

    // フォールバック: descriptionメタタグ
    const description = ogDescription || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || '';

    return {
      title: decodeHTMLEntities(title),
      description: decodeHTMLEntities(description),
      image: ogImage,
      siteName: ogSiteName,
      url,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn(`OGP fetch timeout: ${url}`);
    } else {
      logger.error('OGP fetch error:', error);
    }
    return emptyOgpData(url);
  } finally {
    clearTimeout(timeoutId);
  }
}

function emptyOgpData(url: string): OgpData {
  return {
    title: '',
    description: '',
    image: '',
    siteName: '',
    url,
  };
}

function isLikelyDirectMediaUrl(url: string): boolean {
  try {
    const { pathname, hostname } = new URL(url);
    if (/^video\./i.test(hostname)) return true;
    return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp|mp4|m4v|mov|webm|avi|wmv)(?:$|\?)/i.test(pathname);
  } catch {
    return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp|mp4|m4v|mov|webm|avi|wmv)(?:$|\?)/i.test(url);
  }
}

async function readLimitedArrayBuffer(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  if (!response.body) {
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;

    const remaining = maxBytes - received;
    const chunk = value.length > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    received += chunk.length;

    if (value.length > remaining) {
      await reader.cancel();
      break;
    }
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined.buffer;
}

function normalizeCharset(charset: string): string {
  return charset
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase()
    .replace('shift_jis', 'shift-jis')
    .replace('sjis', 'shift-jis')
    .replace('euc-jp', 'euc-jp')
    .replace('iso-2022-jp', 'iso-2022-jp');
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  return text.replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (match) => {
    // 名前付きエンティティ
    if (entities[match]) {
      return entities[match];
    }

    // 数値文字参照（10進数: &#1234;）
    if (match.startsWith('&#') && !match.startsWith('&#x')) {
      const code = parseInt(match.slice(2, -1), 10);
      return String.fromCharCode(code);
    }

    // 数値文字参照（16進数: &#x1a2b;）
    if (match.startsWith('&#x')) {
      const code = parseInt(match.slice(3, -1), 16);
      return String.fromCharCode(code);
    }

    return match;
  });
}
