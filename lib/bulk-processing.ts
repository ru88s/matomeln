/**
 * 一括AIまとめ処理モジュール
 */

export interface UnsummarizedUrlsResponse {
  urls: string[];
  count: number;
}

export interface GirlsChannelUrlsResponse {
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
  source?: '5ch' | 'talk';
}): Promise<UnsummarizedUrlsResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.append('date', options.date);
  if (options?.lifeOnly) params.append('lifeOnly', 'true');
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`/api/proxy/threadMemo?${params.toString()}`);

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json() as { error?: string };
      errorMsg = errorData.error || errorMsg;
    } catch { /* non-JSON response */ }
    throw new Error(errorMsg);
  }

  const data = await response.json() as UnsummarizedUrlsResponse;

  const isTalkUrl = (url: string) => /talk\.jp\/boards\//i.test(url);
  const isGirlsChannelUrl = (url: string) => /girlschannel\.net\/topics\//i.test(url);

  // スレッドIDでソート（新しい順 = ID降順）
  // 5ch URLのスレッドIDはUnix timestamp形式
  const filteredUrls = data.urls.filter((url) => {
    if (options?.source === 'talk') {
      return isTalkUrl(url);
    }
    if (options?.source === '5ch') {
      return !isTalkUrl(url) && !isGirlsChannelUrl(url);
    }
    return true;
  });

  const sortedUrls = filteredUrls.sort((a, b) => {
    const idA = extractThreadId(a);
    const idB = extractThreadId(b);
    if (!idA || !idB) return 0;
    // 降順（新しい順）
    return parseInt(idB) - parseInt(idA);
  });

  return {
    urls: sortedUrls,
    count: sortedUrls.length,
  };
}

export async function fetchTalkUrls(options?: {
  limit?: number;
}): Promise<UnsummarizedUrlsResponse> {
  return fetchUnsummarizedUrls({ ...options, source: 'talk' });
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
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json() as { error?: string };
      errorMsg = errorData.error || errorMsg;
    } catch { /* non-JSON response */ }
    throw new Error(errorMsg);
  }
}

/**
 * スキップ済みとして登録
 */
export async function markThreadAsSkipped(url: string, reason: string): Promise<void> {
  const response = await fetch('/api/proxy/threadMemo/skip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, reason }),
  });

  if (!response.ok) {
    // スキップマーク失敗はログのみ（処理を止めない）
    console.error('Failed to mark thread as skipped:', url, reason);
  }
}

/**
 * URLからスレッドIDを抽出
 */
export function extractThreadId(url: string): string | null {
  const talkJpMatch = url.match(/talk\.jp\/boards\/[a-z0-9_]+\/(\d+)/i);
  if (talkJpMatch) return talkJpMatch[1];

  // 5ch URL format: https://hayabusa9.5ch.io/test/read.cgi/news/1234567890/
  const match = url.match(/\/(\d{10,})\/?$/);
  return match ? match[1] : null;
}

/**
 * ガールズちゃんねる未まとめURL一覧を取得（スレメモくん経由）
 */
export async function fetchGirlsChannelUrls(options?: {
  limit?: number;
}): Promise<GirlsChannelUrlsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());

  const gcResponse = await fetch(`/api/proxy/getGirlsChannelNew?${params.toString()}`);

  const allUrls: string[] = [];
  let anySuccess = false;

  // ガールズちゃんねる
  if (gcResponse.ok) {
    anySuccess = true;
    const gcData = await gcResponse.json() as GirlsChannelUrlsResponse;
    allUrls.push(...gcData.urls);
  }

  // APIが失敗した場合のみエラー（0件は正常）
  if (!anySuccess) {
    throw new Error('未まとめURLの取得に失敗しました（API接続エラー）');
  }

  // URLをソート（ガルちゃんはトピックID）
  const sortedUrls = allUrls.sort((a, b) => {
    // ガルちゃんURL
    if (a.includes('girlschannel.net') && b.includes('girlschannel.net')) {
      const idA = extractGirlsChannelTopicId(a);
      const idB = extractGirlsChannelTopicId(b);
      if (idA && idB) return parseInt(idB) - parseInt(idA);
    }
    return 0;
  });

  return {
    urls: sortedUrls,
    count: sortedUrls.length,
  };
}

/**
 * ShikutokuURLからトークIDを抽出
 */
export function extractShikutokuTalkId(url: string): string | null {
  const match = url.match(/\/talks\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * ガールズちゃんねるURLからトピックIDを抽出
 */
export function extractGirlsChannelTopicId(url: string): string | null {
  const match = url.match(/\/topics\/(\d+)/);
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
