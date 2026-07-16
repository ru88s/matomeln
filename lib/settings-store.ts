import { normalizeOtherBlogSelectionSettings } from './blog-routing';

export const SETTINGS_CHANGED_EVENT = 'matomeln:settings-changed';
export const OTHER_BLOGS_SETTINGS_KEY = 'matomeln_other_blogs_settings';

export type OtherBlogPostingSettings = {
  postToOtherBlogs: boolean;
  selectedOtherBlogIds: string[];
};

export const DEFAULT_OTHER_BLOG_POSTING_SETTINGS: OtherBlogPostingSettings = {
  postToOtherBlogs: false,
  selectedOtherBlogIds: [],
};

export function parseOtherBlogPostingSettings(
  value: string | null | undefined
): OtherBlogPostingSettings {
  if (!value) return DEFAULT_OTHER_BLOG_POSTING_SETTINGS;
  try {
    const normalized = normalizeOtherBlogSelectionSettings(value) || value;
    const parsed = JSON.parse(normalized) as Partial<OtherBlogPostingSettings>;
    return {
      postToOtherBlogs: parsed.postToOtherBlogs === true,
      selectedOtherBlogIds: Array.isArray(parsed.selectedOtherBlogIds)
        ? [...new Set(parsed.selectedOtherBlogIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
        : [],
    };
  } catch {
    return DEFAULT_OTHER_BLOG_POSTING_SETTINGS;
  }
}

export function serializeOtherBlogPostingSettings(
  settings: OtherBlogPostingSettings
): string {
  return JSON.stringify(parseOtherBlogPostingSettings(JSON.stringify(settings)));
}

export function readOtherBlogPostingSettings(): OtherBlogPostingSettings {
  if (typeof window === 'undefined') return DEFAULT_OTHER_BLOG_POSTING_SETTINGS;
  return parseOtherBlogPostingSettings(localStorage.getItem(OTHER_BLOGS_SETTINGS_KEY));
}

export function writeSetting(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { key } }));
}

export function writeOtherBlogPostingSettings(settings: OtherBlogPostingSettings): void {
  writeSetting(OTHER_BLOGS_SETTINGS_KEY, serializeOtherBlogPostingSettings(settings));
}

export function subscribeToSetting(key: string, callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) callback();
  };
  const onSettingsChanged = (event: Event) => {
    const changedKey = (event as CustomEvent<{ key?: string }>).detail?.key;
    if (!changedKey || changedKey === key) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);
  window.addEventListener('settingsSynced', callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);
    window.removeEventListener('settingsSynced', callback);
  };
}
