import { CommentWithStyle } from './types';

export interface ImageModerationOptions {
  enabled: boolean;
  endpoint: string;
  model: string;
}

export interface ImageModerationResult {
  keptComments: CommentWithStyle[];
  removedComments: CommentWithStyle[];
  reviewComments: CommentWithStyle[];
  checkedImageCount: number;
  unavailable: boolean;
}

export interface RiskyMediaUrlFilterResult {
  keptComments: CommentWithStyle[];
  removedComments: CommentWithStyle[];
}

interface VisionModerationResponse {
  status: 'safe' | 'unsafe' | 'review';
  categories?: string[];
  reason?: string;
}

const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const DEFAULT_IMAGE_MODERATION_MODEL = 'gemma4:12b-mlx';

const RISKY_MEDIA_URL_PATTERN = /(?:gorecenter|bestgore|kaotic|documentingreality|po-kaki-to|pokkakit|pokkakito|porn|xxx|xvideos|xhamster|redtube|erome|motherless|jav|avgle|nsfw|nude|naked)/i;
const URL_PATTERN = /https?:\/\/[^\s<>"'「」『』（）()[\]{}、。，．]+/gi;

export function getImageModerationOptions(): ImageModerationOptions {
  if (typeof window === 'undefined') {
    return {
      enabled: true,
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      model: DEFAULT_IMAGE_MODERATION_MODEL,
    };
  }

  return {
    enabled: localStorage.getItem('matomeln_image_moderation_enabled') !== 'false',
    endpoint: localStorage.getItem('matomeln_ollama_endpoint') || DEFAULT_OLLAMA_ENDPOINT,
    model: localStorage.getItem('matomeln_image_moderation_model') || DEFAULT_IMAGE_MODERATION_MODEL,
  };
}

export function filterRiskyMediaUrlComments(
  comments: CommentWithStyle[]
): RiskyMediaUrlFilterResult {
  const keptComments: CommentWithStyle[] = [];
  const removedComments: CommentWithStyle[] = [];

  for (const comment of comments) {
    const bodyUrls = comment.body.match(URL_PATTERN) || [];
    const imageUrls = (comment.images || []).filter((image): image is string =>
      typeof image === 'string' && image.trim().length > 0
    );
    const urls = [...bodyUrls, ...imageUrls];

    if (urls.some(url => RISKY_MEDIA_URL_PATTERN.test(url))) {
      console.log(`🚫 危険メディアURL付きレスを除外: ${comment.res_id}`);
      removedComments.push(comment);
      continue;
    }

    keptComments.push(comment);
  }

  return { keptComments, removedComments };
}

async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`/api/proxy/fetchImage?url=${encodeURIComponent(imageUrl)}`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json() as { data?: string };
    return data.data || null;
  } catch (error) {
    console.warn('画像の取得に失敗:', imageUrl, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractJsonObject(content: string): string {
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return '';
  return content.slice(firstBrace, lastBrace + 1);
}

async function classifyImageWithOllama(
  imageBase64: string,
  options: ImageModerationOptions
): Promise<VisionModerationResponse | null> {
  const endpoint = options.endpoint.replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        stream: false,
        think: false,
        keep_alive: '35m',
        format: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['safe', 'unsafe', 'review'] },
            categories: { type: 'array', items: { type: 'string', enum: ['gore', 'sexual'] } },
            reason: { type: 'string' },
          },
          required: ['status', 'categories', 'reason'],
          additionalProperties: false,
        },
        options: {
          temperature: 0,
          num_predict: 80,
          num_ctx: 16384,
        },
        messages: [
          {
            role: 'user',
            content: [
              'Classify this image for a Japanese blog comment selection tool.',
              'Return {"status":"unsafe","categories":["gore" or "sexual"],"reason":"short"} for graphic gore, severe injury, exposed genitals, explicit nudity, pornographic sexual content, or a sexual act.',
              'Return {"status":"safe","categories":[],"reason":"safe"} for normal photos, memes, food, animals, screenshots, clothed people, swimsuits without explicit nudity, or non-graphic content.',
              'If uncertain or the image cannot be understood, return {"status":"review","categories":[],"reason":"uncertain"}.',
              'JSON only.',
            ].join(' '),
            images: [imageBase64],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`画像判定モデルの呼び出しに失敗: ${response.status}`);
      return null;
    }

    const data = await response.json() as { message?: { content?: string }; response?: string };
    const content = data.message?.content || data.response || '';
    const json = extractJsonObject(content);
    if (!json) return null;

    const parsed = JSON.parse(json) as VisionModerationResponse;
    if (!['safe', 'unsafe', 'review'].includes(parsed.status) || !Array.isArray(parsed.categories) || typeof parsed.reason !== 'string') return null;
    if (parsed.categories.some(category => category !== 'gore' && category !== 'sexual')) return null;
    if ((parsed.status === 'safe' && parsed.categories.length > 0) || (parsed.status === 'unsafe' && parsed.categories.length === 0)) {
      return { status: 'review', categories: [], reason: 'inconsistent classification' };
    }
    return {
      status: parsed.status,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    };
  } catch (error) {
    console.warn('画像判定に失敗:', error);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function filterUnsafeImageComments(
  comments: CommentWithStyle[],
  options: ImageModerationOptions = getImageModerationOptions()
): Promise<ImageModerationResult> {
  if (!options.enabled) {
    return {
      keptComments: comments,
      removedComments: [],
      reviewComments: [],
      checkedImageCount: 0,
      unavailable: false,
    };
  }

  const keptComments: CommentWithStyle[] = [];
  const removedComments: CommentWithStyle[] = [];
  const reviewComments: CommentWithStyle[] = [];
  let checkedImageCount = 0;
  let unavailable = false;
  const imageResults = new Map<string, VisionModerationResponse | null>();

  for (const comment of comments) {
    const imageUrls = (comment.images || []).filter((image): image is string =>
      typeof image === 'string' && image.trim().length > 0
    );

    if (imageUrls.length === 0) {
      keptComments.push(comment);
      continue;
    }

    let shouldRemove = false;
    let needsReview = false;
    for (const imageUrl of imageUrls) {
      if (!imageResults.has(imageUrl)) {
        const imageBase64 = await fetchImageAsBase64(imageUrl);
        if (imageBase64) checkedImageCount++;
        imageResults.set(imageUrl, imageBase64 ? await classifyImageWithOllama(imageBase64, options) : null);
      }
      const moderation = imageResults.get(imageUrl);
      if (!moderation) {
        unavailable = true;
        needsReview = true;
        continue;
      }

      if (moderation.status === 'review') needsReview = true;
      if (moderation.status === 'unsafe') {
        console.log(`🚫 画像NGレスを除外: ${comment.res_id} (${moderation.categories?.join(', ') || 'unsafe'})`);
        shouldRemove = true;
        break;
      }
    }

    if (shouldRemove) {
      removedComments.push(comment);
    } else if (needsReview) {
      reviewComments.push(comment);
    } else {
      keptComments.push(comment);
    }
  }

  return {
    keptComments,
    removedComments,
    reviewComments,
    checkedImageCount,
    unavailable,
  };
}
