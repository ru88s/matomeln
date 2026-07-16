'use client';

import { HeroButton } from '@/components/ui/HeroControls';
import { useState } from 'react';
import { BlogSettings, Comment } from '@/lib/types';

interface SettingsSidebarProps {
  comments: Comment[];
  onSelectFirstPoster: () => void;
  onChangeFirstPosterColor: (color: string) => void;
  selectedCount: number;
  totalCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showOnlySelected: boolean;
  onShowOnlySelectedChange: (show: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  blogs: BlogSettings[];
  selectedBlogId: string | null;
  postToOtherBlogs: boolean;
  selectedOtherBlogIds: string[];
  onOpenSettings: () => void;
}

export default function SettingsSidebar({
  comments,
  onSelectFirstPoster,
  onChangeFirstPosterColor,
  selectedCount,
  totalCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showOnlySelected,
  onShowOnlySelectedChange,
  onSelectAll,
  onDeselectAll,
  blogs,
  selectedBlogId,
  postToOtherBlogs,
  selectedOtherBlogIds,
  onOpenSettings,
}: SettingsSidebarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // スレ主のID
  const firstPosterId = comments[0]?.name_id;
  // スレ主のコメント数を取得
  const firstPosterCount = firstPosterId ? comments.filter(c => c.name_id === firstPosterId).length : 0;
  const simultaneousPostBlogs = postToOtherBlogs
    ? blogs.filter((blog) => blog.id !== selectedBlogId && selectedOtherBlogIds.includes(blog.id))
    : [];
  const simultaneousPostNames = simultaneousPostBlogs.map((blog) => blog.name).join('・');

  return (
    <div className="w-full flex-shrink-0 lg:w-56">
      <div className="bg-white rounded-lg border border-orange-200 p-4 shadow-sm space-y-4 lg:sticky lg:top-20">
        <div id="auto-run-sidebar-slot" />

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-600">同時投稿先</span>
            <span className={`text-xs font-bold ${
              simultaneousPostBlogs.length > 0 ? 'text-purple-700' : 'text-gray-400'
            }`}>
              {simultaneousPostBlogs.length > 0 ? `${simultaneousPostBlogs.length}サイト` : 'OFF'}
            </span>
          </div>
          <p
            title={simultaneousPostNames || undefined}
            className={`mt-1 truncate text-xs ${
              simultaneousPostBlogs.length > 0 ? 'text-gray-700' : 'text-gray-400'
            }`}
          >
            {simultaneousPostNames || '投稿先は未選択'}
          </p>
          <HeroButton
            type="button"
            onClick={onOpenSettings}
            className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
          >
            同時投稿を設定
          </HeroButton>
        </div>

        {/* 選択状況 - 最も重要なので一番上 */}
        <div className="space-y-3">
          <div className="text-center py-2 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg">
            <span className="text-2xl font-bold text-orange-500">{selectedCount}</span>
            <span className="text-sm text-gray-500"> / {totalCount}件</span>
          </div>
          <div className="flex gap-2">
            <HeroButton
              onClick={onSelectAll}
              className="flex-1 text-xs bg-orange-500 text-white hover:bg-orange-600 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              全て選択
            </HeroButton>
            <HeroButton
              onClick={onDeselectAll}
              className="flex-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              解除
            </HeroButton>
          </div>
          <HeroButton
            type="button"
            onClick={() => onShowOnlySelectedChange(!showOnlySelected)}
            aria-pressed={showOnlySelected}
            className={`w-full rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
              showOnlySelected
                ? 'border-orange-300 bg-orange-50 text-orange-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50/50'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">選択済みのみ表示</span>
              <span className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                showOnlySelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-transparent'
              }`}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </span>
          </HeroButton>
        </div>

        <div id="bulk-auto-run-sidebar-slot" className="[&:empty]:hidden" />

        {/* スレ主操作 - よく使う機能 */}
        {firstPosterId && (
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-600">スレ主</h4>
              <span className="text-xs text-orange-500 font-bold">{firstPosterCount}件</span>
            </div>
            <HeroButton
              onClick={onSelectFirstPoster}
              className="w-full text-sm bg-red-500 text-white hover:bg-red-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              スレ主を全選択
            </HeroButton>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">色:</span>
              {['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#000000'].map(color => (
                <HeroButton
                  key={color}
                  onClick={() => onChangeFirstPosterColor(color)}
                  className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all cursor-pointer"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 戻す・やり直す */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <HeroButton
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex-1 text-xs px-2 py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
              canUndo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="font-bold">戻す</span>
            </div>
            <kbd className="text-[9px] text-gray-400 font-mono">⌘Z</kbd>
          </HeroButton>
          <HeroButton
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex-1 text-xs px-2 py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
              canRedo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
              <span className="font-bold">やり直す</span>
            </div>
            <kbd className="text-[9px] text-gray-400 font-mono">⌘⇧Z</kbd>
          </HeroButton>
        </div>

        {/* ショートカット - 折りたたみ可能 */}
        <div className="pt-3 border-t border-gray-100">
          <HeroButton
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <span className="font-bold">ショートカット</span>
            <svg
              className={`w-4 h-4 transition-transform ${showShortcuts ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </HeroButton>
          {showShortcuts && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">Space</kbd>
                <span className="text-gray-500">選択</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">⌘E</kbd>
                <span className="text-gray-500">編集</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">1-0</kbd>
                <span className="text-gray-500">色</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">Q,W,E</kbd>
                <span className="text-gray-500">サイズ</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">⌘Z</kbd>
                <span className="text-gray-500">戻す</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">⌘⇧Z</kbd>
                <span className="text-gray-500">やり直し</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">⌘↵</kbd>
                <span className="text-gray-500">タグ発行</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
