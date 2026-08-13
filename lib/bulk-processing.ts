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

const LOCAL_SUMMARIZED_URLS_KEY = 'matomeln:locally-summarized-urls-v1';
const LOCAL_SKIPPED_URLS_KEY = 'matomeln:locally-skipped-urls-v1';
const LOCAL_PROCESSING_URLS_KEY = 'matomeln:locally-processing-urls-v1';
const PENDING_SUMMARIZED_URLS_KEY = 'matomeln:pending-summarized-urls-v1';
const THREAD_MEMO_MARK_RETRY_COUNT = 3;
const THREAD_MEMO_MARK_TIMEOUT_MS = 10000;

function normalizeThreadMemoUrl(url: string): string {
  return url.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function readLocalUrlSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((url): url is string => typeof url === 'string' && url.length > 0)
        : []
    );
  } catch {
    return new Set();
  }
}

function writeLocalUrlSet(key: string, urls: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...urls].slice(-5000)));
  } catch (error) {
    console.warn('ローカルURL台帳の保存に失敗:', error);
  }
}

function rememberLocalUrl(key: string, url: string): void {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  if (!normalizedUrl) return;
  const urls = readLocalUrlSet(key);
  urls.add(normalizedUrl);
  writeLocalUrlSet(key, urls);
}

function removeLocalUrl(key: string, url: string): void {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  const urls = readLocalUrlSet(key);
  urls.delete(normalizedUrl);
  writeLocalUrlSet(key, urls);
}

function isLocallyProcessedUrl(url: string): boolean {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  return readLocalUrlSet(LOCAL_SUMMARIZED_URLS_KEY).has(normalizedUrl)
    || readLocalUrlSet(LOCAL_SKIPPED_URLS_KEY).has(normalizedUrl)
    || readLocalUrlSet(LOCAL_PROCESSING_URLS_KEY).has(normalizedUrl);
}

/**
 * 処理開始直前にURLを永続予約する。
 * 別タブやリロード後も、記事投稿中の同じスレを再取得しないための保護。
 */
export function claimThreadForProcessing(url: string): boolean {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  if (!normalizedUrl || isLocallyProcessedUrl(normalizedUrl)) return false;

  const processingUrls = readLocalUrlSet(LOCAL_PROCESSING_URLS_KEY);
  if (processingUrls.has(normalizedUrl)) return false;
  processingUrls.add(normalizedUrl);
  writeLocalUrlSet(LOCAL_PROCESSING_URLS_KEY, processingUrls);

  // localStorage書き込み後に再読込し、別タブとの競合時は予約失敗として扱う。
  return readLocalUrlSet(LOCAL_PROCESSING_URLS_KEY).has(normalizedUrl);
}

export function releaseThreadProcessingClaim(url: string): void {
  removeLocalUrl(LOCAL_PROCESSING_URLS_KEY, url);
}

async function postThreadMemoMark(url: string, reason?: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), THREAD_MEMO_MARK_TIMEOUT_MS);
  const endpoint = reason === undefined ? '/api/proxy/threadMemo' : '/api/proxy/threadMemo/skip';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason === undefined ? { url } : { url, reason }),
      signal: controller.signal,
    });
    return response.ok;
  } catch (error) {
    console.warn('スレメモくんへの状態登録通信に失敗:', error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function retryThreadMemoMark(url: string, reason?: string): Promise<boolean> {
  for (let attempt = 1; attempt <= THREAD_MEMO_MARK_RETRY_COUNT; attempt += 1) {
    if (await postThreadMemoMark(url, reason)) return true;
    if (attempt < THREAD_MEMO_MARK_RETRY_COUNT) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 1000));
    }
  }
  return false;
}

async function retryPendingSummarizedMarks(): Promise<void> {
  const pendingUrls = [...readLocalUrlSet(PENDING_SUMMARIZED_URLS_KEY)].slice(0, 20);
  for (const url of pendingUrls) {
    if (await postThreadMemoMark(url)) {
      removeLocalUrl(PENDING_SUMMARIZED_URLS_KEY, url);
    }
  }
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
  await retryPendingSummarizedMarks();

  const params = new URLSearchParams();
  if (options?.date) params.append('date', options.date);
  if (options?.lifeOnly) params.append('lifeOnly', 'true');
  if (options?.source) params.append('source', options.source);
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

  // スレッドIDでソート（古い順 = ID昇順）
  // 5ch/Talk URLのスレッドIDは時系列で増えるため、小さいIDを先に処理する。
  const filteredUrls = data.urls.filter((url) => {
    if (isLocallyProcessedUrl(url)) return false;
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
    return parseInt(idA, 10) - parseInt(idB, 10);
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
export async function markThreadAsSummarized(url: string): Promise<boolean> {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  // 記事投稿成功直後に先にローカルで固定し、API障害時の再投稿を防ぐ。
  rememberLocalUrl(LOCAL_SUMMARIZED_URLS_KEY, normalizedUrl);
  releaseThreadProcessingClaim(normalizedUrl);

  const markedExternally = await retryThreadMemoMark(normalizedUrl);
  if (markedExternally) {
    removeLocalUrl(PENDING_SUMMARIZED_URLS_KEY, normalizedUrl);
    return true;
  }

  rememberLocalUrl(PENDING_SUMMARIZED_URLS_KEY, normalizedUrl);
  console.warn('⚠️ スレメモくん登録は保留。ローカルでは重複防止済み:', normalizedUrl);
  return false;
}

/**
 * スキップ済みとして登録
 */
export async function markThreadAsSkipped(url: string, reason: string): Promise<boolean> {
  const normalizedUrl = normalizeThreadMemoUrl(url);
  // スキップ対象も同じURLを再取得しない。
  rememberLocalUrl(LOCAL_SKIPPED_URLS_KEY, normalizedUrl);
  releaseThreadProcessingClaim(normalizedUrl);

  const markedExternally = await retryThreadMemoMark(normalizedUrl, reason);
  if (!markedExternally) {
    console.error('スレメモくんへのスキップ登録を保留（ローカルでは除外済み）:', normalizedUrl, reason);
  }
  return markedExternally;
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
  await retryPendingSummarizedMarks();

  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());

  const gcResponse = await fetch(`/api/proxy/getGirlsChannelNew?${params.toString()}`);

  const allUrls: string[] = [];
  let anySuccess = false;

  // ガールズちゃんねる
  if (gcResponse.ok) {
    anySuccess = true;
    const gcData = await gcResponse.json() as GirlsChannelUrlsResponse;
    allUrls.push(...gcData.urls.filter((url) => !isLocallyProcessedUrl(url)));
  }

  // APIが失敗した場合のみエラー（0件は正常）
  if (!anySuccess) {
    throw new Error('未まとめURLの取得に失敗しました（API接続エラー）');
  }

  // URLを古い順にソート（ガルちゃんは小さいトピックIDが古い）
  const sortedUrls = allUrls.sort((a, b) => {
    // ガルちゃんURL
    if (a.includes('girlschannel.net') && b.includes('girlschannel.net')) {
      const idA = extractGirlsChannelTopicId(a);
      const idB = extractGirlsChannelTopicId(b);
      if (idA && idB) return parseInt(idA, 10) - parseInt(idB, 10);
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
