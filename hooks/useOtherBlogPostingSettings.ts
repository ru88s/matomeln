'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_OTHER_BLOG_POSTING_SETTINGS,
  OTHER_BLOGS_SETTINGS_KEY,
  type OtherBlogPostingSettings,
  readOtherBlogPostingSettings,
  subscribeToSetting,
  writeOtherBlogPostingSettings,
} from '@/lib/settings-store';

export function useOtherBlogPostingSettings() {
  const [settings, setSettingsState] = useState<OtherBlogPostingSettings>(
    DEFAULT_OTHER_BLOG_POSTING_SETTINGS
  );

  useEffect(() => {
    const refresh = () => setSettingsState(readOtherBlogPostingSettings());
    refresh();
    return subscribeToSetting(OTHER_BLOGS_SETTINGS_KEY, refresh);
  }, []);

  const setSettings = useCallback((next: OtherBlogPostingSettings) => {
    writeOtherBlogPostingSettings(next);
    setSettingsState(next);
  }, []);

  return { settings, setSettings };
}
