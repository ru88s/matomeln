'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ensureLifestyleBlogs,
  normalizeOtherBlogSelectionSettings,
  normalizeBlogSettingsForSharedAuth,
} from '@/lib/blog-routing';
import type { BlogSettings } from '@/lib/types';
import { writeSetting } from '@/lib/settings-store';

// サーバーに同期する設定キー一覧
const SYNCED_KEYS = [
  'customNameSettings',
  'showIdInHtml',
  'blogSettingsList',
  'selectedBlogId',
  'matomeln_ai_summary_provider',
  'matomeln_ollama_endpoint',
  'matomeln_ollama_model',
  'matomeln_image_moderation_enabled',
  'matomeln_image_moderation_model',
  'matomeln_claude_api_key',
  'matomeln_gemini_api_key',
  'matomeln_openai_api_key',
  'matomeln_thumbnail_enabled',
  'matomeln_thumbnail_provider',
  'matomeln_openai_image_model',
  'matomeln_openai_image_quality',
  'matomeln_thumbnail_characters',
  'matomeln_other_blogs_settings',
  'matomeln_custom_footer_html',
] as const;

type SettingsKey = typeof SYNCED_KEYS[number];

type SettingsMap = Partial<Record<SettingsKey, string | null>>;

function hasSelectedOtherBlogs(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const settings = JSON.parse(value) as {
      postToOtherBlogs?: boolean;
      selectedOtherBlogIds?: unknown;
    };
    return settings.postToOtherBlogs === true
      && Array.isArray(settings.selectedOtherBlogIds)
      && settings.selectedOtherBlogIds.some((id) => typeof id === 'string' && id.length > 0);
  } catch {
    return false;
  }
}

function mergeBlogSettingsLists(
  serverValue: string | null | undefined,
  localValue: string | null | undefined
): { value: string | null | undefined; changed: boolean } {
  if (!localValue) return { value: serverValue, changed: false };

  try {
    const serverBlogs = serverValue ? JSON.parse(serverValue) as BlogSettings[] : [];
    const localBlogs = JSON.parse(localValue) as BlogSettings[];
    if (!Array.isArray(serverBlogs) || !Array.isArray(localBlogs)) {
      return { value: serverValue, changed: false };
    }

    const identity = (blog: BlogSettings) => {
      const blogType = blog.blogType || 'livedoor';
      const blogId = blog.blogId.trim().replace(/\/+$/, '').toLowerCase();
      return `${blogType}:${blogId}`;
    };
    const mergedByIdentity = new Map(serverBlogs.map((blog) => [identity(blog), blog]));
    for (const blog of localBlogs) {
      if (blog?.id && blog.blogId) mergedByIdentity.set(identity(blog), blog);
    }

    const merged = normalizeBlogSettingsList(JSON.stringify([...mergedByIdentity.values()]));
    const normalizedServer = normalizeBlogSettingsList(JSON.stringify(serverBlogs));
    return { value: merged, changed: merged !== normalizedServer };
  } catch {
    return { value: serverValue, changed: false };
  }
}

/**
 * The local development settings endpoint is memory-backed and resets when the
 * dev server restarts. Do not let that empty default erase a valid browser
 * selection; use the browser copy to repopulate the server instead.
 */
function mergeServerSettingsWithDurableLocal(
  serverSettings: SettingsMap,
  localSettings: SettingsMap
): { merged: SettingsMap; shouldRestoreServer: boolean } {
  const merged = { ...serverSettings };
  let shouldRestoreServer = false;
  const localOtherBlogs = localSettings.matomeln_other_blogs_settings;
  const serverOtherBlogs = serverSettings.matomeln_other_blogs_settings;

  const mergedBlogs = mergeBlogSettingsLists(
    serverSettings.blogSettingsList,
    localSettings.blogSettingsList
  );
  if (mergedBlogs.changed && mergedBlogs.value) {
    merged.blogSettingsList = mergedBlogs.value;
    shouldRestoreServer = true;
  }

  if (hasSelectedOtherBlogs(localOtherBlogs) && !hasSelectedOtherBlogs(serverOtherBlogs)) {
    merged.matomeln_other_blogs_settings = localOtherBlogs;
    shouldRestoreServer = true;
  }

  return { merged, shouldRestoreServer };
}

function sanitizeCustomNameSettings(value: string): string {
  try {
    const settings = JSON.parse(value) as { name?: unknown; bold?: unknown; color?: unknown };
    const name = typeof settings.name === 'string' ? settings.name.trim() : '';
    const safeName = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name) ? '' : name;
    return JSON.stringify({
      name: safeName,
      bold: settings.bold !== false,
      color: typeof settings.color === 'string' && settings.color ? settings.color : '#ff69b4',
    });
  } catch {
    return JSON.stringify({ name: '', bold: true, color: '#ff69b4' });
  }
}

function normalizeBlogSettingsList(value: string): string {
  try {
    const blogs = JSON.parse(value) as BlogSettings[];
    const normalizedBlogs = ensureLifestyleBlogs(normalizeBlogSettingsForSharedAuth(blogs));
    return JSON.stringify(normalizedBlogs);
  } catch {
    return value;
  }
}

function normalizeSettingsForStorage(settings: SettingsMap): SettingsMap {
  const normalized = { ...settings };
  if (typeof normalized.customNameSettings === 'string') {
    normalized.customNameSettings = sanitizeCustomNameSettings(normalized.customNameSettings);
  }
  if (typeof normalized.blogSettingsList === 'string') {
    normalized.blogSettingsList = normalizeBlogSettingsList(normalized.blogSettingsList);
  }
  if (typeof normalized.matomeln_other_blogs_settings === 'string') {
    normalized.matomeln_other_blogs_settings = normalizeOtherBlogSelectionSettings(normalized.matomeln_other_blogs_settings) || normalized.matomeln_other_blogs_settings;
  }
  return normalized;
}

// localStorageからすべての同期対象設定を読み取る
function readAllFromLocalStorage(): SettingsMap {
  const result: SettingsMap = {};
  for (const key of SYNCED_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

// サーバーから設定を取得
async function fetchServerSettings(): Promise<SettingsMap | null> {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { settings?: SettingsMap };
    return (data.settings ?? {}) as SettingsMap;
  } catch {
    return null;
  }
}

// サーバーに設定を保存
async function postServerSettings(settings: SettingsMap): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useSettings() {
  const initializedRef = useRef(false);
  const serverAvailableRef = useRef(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初回マウント時: サーバーから取得してlocalStorageとマージ
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const serverSettings = await fetchServerSettings();

      if (serverSettings === null) {
        // サーバー接続不可 — localStorageのみで動作
        serverAvailableRef.current = false;
        return;
      }

      const localSettings = normalizeSettingsForStorage(readAllFromLocalStorage());
      const normalizedServerSettings = normalizeSettingsForStorage(serverSettings);
      const {
        merged: mergedServerSettings,
        shouldRestoreServer,
      } = mergeServerSettingsWithDurableLocal(normalizedServerSettings, localSettings);
      const hasServerData = Object.keys(mergedServerSettings).length > 0;
      const hasLocalData = Object.keys(localSettings).length > 0;

      if (!hasServerData && hasLocalData) {
        // 初回移行: localStorageの既存データをサーバーに送信
        await postServerSettings(localSettings);
        return;
      }

      if (hasServerData) {
        // サーバーの設定をlocalStorageに反映（サーバー優先）
        for (const key of SYNCED_KEYS) {
          const serverValue = mergedServerSettings[key];
          if (serverValue !== undefined && serverValue !== null) {
            localStorage.setItem(key, serverValue as string);
          }
        }
        if (shouldRestoreServer) {
          await postServerSettings(normalizeSettingsForStorage(readAllFromLocalStorage()));
        }
        // ページのstateはlocalStorageから読み込まれるので、
        // 設定が変わった場合はリロードイベントで反映
        window.dispatchEvent(new CustomEvent('settingsSynced'));
      }
    })();
  }, []);

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  // 設定を保存（localStorage即座 + サーバーはデバウンス付き非同期）
  const saveSettings = useCallback((updates: SettingsMap) => {
    const normalizedUpdates = normalizeSettingsForStorage(updates);
    // localStorageに即座に書き込み
    for (const [key, value] of Object.entries(normalizedUpdates)) {
      writeSetting(key, value ?? null);
    }

    // サーバーに非同期送信（2秒デバウンス）
    if (serverAvailableRef.current) {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        const allSettings = readAllFromLocalStorage();
        postServerSettings(allSettings);
        syncTimerRef.current = null;
      }, 2000);
    }
  }, []);

  return { saveSettings };
}
