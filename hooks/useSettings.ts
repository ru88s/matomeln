'use client';

import { useCallback, useEffect, useRef } from 'react';

// サーバーに同期する設定キー一覧
const SYNCED_KEYS = [
  'customNameSettings',
  'showIdInHtml',
  'blogSettingsList',
  'selectedBlogId',
  'matomeln_claude_api_key',
  'matomeln_gemini_api_key',
  'matomeln_openai_api_key',
  'matomeln_thumbnail_provider',
  'matomeln_thumbnail_characters',
  'matomeln_other_blogs_settings',
  'matomeln_custom_footer_html',
] as const;

type SettingsKey = typeof SYNCED_KEYS[number];

type SettingsMap = Partial<Record<SettingsKey, string | null>>;

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

      const localSettings = readAllFromLocalStorage();
      const hasServerData = Object.keys(serverSettings).length > 0;
      const hasLocalData = Object.keys(localSettings).length > 0;

      if (!hasServerData && hasLocalData) {
        // 初回移行: localStorageの既存データをサーバーに送信
        await postServerSettings(localSettings);
        return;
      }

      if (hasServerData) {
        // サーバーの設定をlocalStorageに反映（サーバー優先）
        for (const key of SYNCED_KEYS) {
          const serverValue = serverSettings[key];
          if (serverValue !== undefined && serverValue !== null) {
            localStorage.setItem(key, serverValue as string);
          }
        }
        // ページのstateはlocalStorageから読み込まれるので、
        // 設定が変わった場合はリロードイベントで反映
        window.dispatchEvent(new CustomEvent('settingsSynced'));
      }
    })();
  }, []);

  // 設定を保存（localStorage即座 + サーバー非同期）
  const saveSettings = useCallback((updates: SettingsMap) => {
    // localStorageに即座に書き込み
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }

    // サーバーに非同期送信
    if (serverAvailableRef.current) {
      // 全設定を送信（部分更新ではなくフルスナップショット）
      const allSettings = readAllFromLocalStorage();
      postServerSettings(allSettings);
    }
  }, []);

  return { saveSettings };
}
