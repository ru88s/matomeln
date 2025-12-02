/**
 * 一括AIまとめ処理モジュール
 */

export interface UnsummarizedUrlsResponse {
  urls: string[];
  count: number;
}

export interface BulkProcessStatus {
  isProcessing: boolean;
  currentIndex: number;
  totalCount: number;
  currentUrl: string | null;
  completedUrls: string[];
  failedUrls: { url: string; error: string }[];
  startTime: number | null;
}

/**
 * 未まとめURL一覧を取得
 */
export async function fetchUnsummarizedUrls(options?: {
  date?: string;
  lifeOnly?: boolean;
  limit?: number;
}): Promise<UnsummarizedUrlsResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.append('date', options.date);
  if (options?.lifeOnly) params.append('lifeOnly', 'true');
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`/api/proxy/threadMemo?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch unsummarized URLs');
  }

  return response.json();
}

/**
 * まとめ済みとして登録
 */
export async function markThreadAsSummarized(url: string): Promise<void> {
  const response = await fetch('/api/proxy/threadMemo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark thread as summarized');
  }
}

/**
 * URLからスレッドIDを抽出
 */
export function extractThreadId(url: string): string | null {
  // 5ch URL format: https://hayabusa9.5ch.net/test/read.cgi/news/1234567890/
  const match = url.match(/\/(\d{10,})\/?$/);
  return match ? match[1] : null;
}

/**
 * 初期状態を取得
 */
export function getInitialBulkStatus(): BulkProcessStatus {
  return {
    isProcessing: false,
    currentIndex: 0,
    totalCount: 0,
    currentUrl: null,
    completedUrls: [],
    failedUrls: [],
    startTime: null,
  };
}
