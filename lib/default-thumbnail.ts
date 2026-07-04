export const DEFAULT_AI_THUMBNAIL_PATH = '/images/default-ai-thumbnail.png';
export const DEFAULT_AI_THUMBNAIL_PUBLIC_URL = 'https://livedoor.blogimg.jp/garlsvip/imgs/f/2/f20187f5.png';

export function getDefaultAIThumbnailUrl(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_AI_THUMBNAIL_URL || DEFAULT_AI_THUMBNAIL_PUBLIC_URL;
}

export async function uploadDefaultAIThumbnail(settings?: unknown): Promise<string> {
  void settings;
  return getDefaultAIThumbnailUrl();
}
