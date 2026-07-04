import type { BlogSettings } from '@/lib/types';

export const DEFAULT_AI_THUMBNAIL_PATH = '/images/default-ai-thumbnail.png';
export const DEFAULT_AI_THUMBNAIL_PUBLIC_URL = 'https://matomeln.com/images/default-ai-thumbnail.png';
export const DEFAULT_AI_THUMBNAIL_FILENAME = 'default-ai-thumbnail.png';

type UploadSettings = Pick<BlogSettings, 'blogId' | 'apiUsername' | 'apiKey'>;

export function getDefaultAIThumbnailUrl(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_AI_THUMBNAIL_URL || DEFAULT_AI_THUMBNAIL_PUBLIC_URL;
}

export async function getDefaultAIThumbnailBlob(): Promise<Blob> {
  const response = await fetch(DEFAULT_AI_THUMBNAIL_PATH, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error('デフォルトサムネイル画像の取得に失敗しました');
  }
  return response.blob();
}

export async function getDefaultAIThumbnailBase64(): Promise<string> {
  const blob = await getDefaultAIThumbnailBlob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, base64 = ''] = result.split(',');
      if (!base64) {
        reject(new Error('デフォルトサムネイル画像の変換に失敗しました'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('デフォルトサムネイル画像の読み込みに失敗しました'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadDefaultAIThumbnail(settings: UploadSettings): Promise<string> {
  const blob = await getDefaultAIThumbnailBlob();
  const formData = new FormData();
  formData.append('blogId', settings.blogId);
  if (settings.apiUsername) {
    formData.append('apiUsername', settings.apiUsername);
  }
  formData.append('apiKey', settings.apiKey);
  formData.append('file', blob, DEFAULT_AI_THUMBNAIL_FILENAME.replace('.png', `-${Date.now()}.png`));

  const response = await fetch('/api/proxy/uploadImage', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
  if (!response.ok || !data?.url) {
    throw new Error(data?.error || 'デフォルトサムネイルのアップロードに失敗しました');
  }

  return data.url;
}
