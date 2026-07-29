import { isLifestyleBlog, isOhimeBlog } from './blog-routing';
import type { BlogSettings } from './types';

export const LIFESTYLE_DAILY_POST_LIMIT = 50;
export const LIFESTYLE_POST_QUOTA_CHANGED_EVENT = 'matomeln:lifestyle-post-quota-changed';

const LIFESTYLE_POST_QUOTA_STORAGE_KEY = 'matomeln_lifestyle_post_quota_v1';

type LifestylePostQuotaStore = {
  date: string;
  counts: Record<string, number>;
};

function getJstDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getBlogKey(blog: BlogSettings): string {
  return blog.id || blog.blogId;
}

export function hasLifestyleDailyPostLimit(blog: BlogSettings): boolean {
  return isLifestyleBlog(blog) && !isOhimeBlog(blog);
}

function createEmptyStore(): LifestylePostQuotaStore {
  return { date: getJstDateKey(), counts: {} };
}

function readStore(): LifestylePostQuotaStore {
  if (typeof window === 'undefined') return createEmptyStore();

  const today = getJstDateKey();
  try {
    const parsed = JSON.parse(
      localStorage.getItem(LIFESTYLE_POST_QUOTA_STORAGE_KEY) || ''
    ) as Partial<LifestylePostQuotaStore>;
    if (parsed.date !== today || !parsed.counts || typeof parsed.counts !== 'object') {
      return { date: today, counts: {} };
    }

    const counts = Object.fromEntries(
      Object.entries(parsed.counts)
        .filter((entry): entry is [string, number] => (
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
        ))
        .map(([key, count]) => [key, Math.floor(count)])
    );
    return { date: today, counts };
  } catch {
    return { date: today, counts: {} };
  }
}

function writeStore(store: LifestylePostQuotaStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LIFESTYLE_POST_QUOTA_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(LIFESTYLE_POST_QUOTA_CHANGED_EVENT));
}

export function getLifestyleDailyPostCount(blog: BlogSettings): number {
  if (!hasLifestyleDailyPostLimit(blog)) return 0;
  return readStore().counts[getBlogKey(blog)] || 0;
}

export function getLifestyleDailyPostQuotaSkipReason(blog: BlogSettings): string | null {
  if (!hasLifestyleDailyPostLimit(blog)) return null;
  if (getLifestyleDailyPostCount(blog) < LIFESTYLE_DAILY_POST_LIMIT) return null;
  return `本日の投稿上限（${LIFESTYLE_DAILY_POST_LIMIT}件）に達したためスキップしました`;
}

export function recordLifestylePostSuccess(blog: BlogSettings): number {
  if (!hasLifestyleDailyPostLimit(blog)) return 0;

  const store = readStore();
  const key = getBlogKey(blog);
  const nextCount = (store.counts[key] || 0) + 1;
  store.counts[key] = nextCount;
  writeStore(store);
  return nextCount;
}
