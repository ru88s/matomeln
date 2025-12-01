'use client';

import { useState } from 'react';
import { Comment } from '@/lib/types';

interface SettingsSidebarProps {
  customName: string;
  onCustomNameChange: (name: string) => void;
  customNameBold: boolean;
  onCustomNameBoldChange: (bold: boolean) => void;
  customNameColor: string;
  onCustomNameColorChange: (color: string) => void;
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
}

export default function SettingsSidebar({
  customName,
  onCustomNameChange,
  customNameBold,
  onCustomNameBoldChange,
  customNameColor,
  onCustomNameColorChange,
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
}: SettingsSidebarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // スレ主のID
  const firstPosterId = comments[0]?.name_id;
  // スレ主のコメント数を取得
  const firstPosterCount = firstPosterId ? comments.filter(c => c.name_id === firstPosterId).length : 0;

  return (
    <div className="w-56 flex-shrink-0">
      <div className="sticky top-4 bg-white rounded-2xl border border-orange-200 p-4 shadow-sm space-y-4">

        {/* 選択状況 - 最も重要なので一番上 */}
        <div className="space-y-3">
          <div className="text-center py-2 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg">
            <span className="text-2xl font-bold text-orange-500">{selectedCount}</span>
            <span className="text-sm text-gray-500"> / {totalCount}件</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="flex-1 text-xs bg-orange-500 text-white hover:bg-orange-600 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              全て選択
            </button>
            <button
              onClick={onDeselectAll}
              className="flex-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              解除
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showOnlySelected}
              onChange={(e) => onShowOnlySelectedChange(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded cursor-pointer"
            />
            <span className="text-gray-700">選択済みのみ表示</span>
          </label>
        </div>

        {/* スレ主操作 - よく使う機能 */}
        {firstPosterId && firstPosterCount > 1 && (
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-600">スレ主</h4>
              <span className="text-xs text-orange-500 font-bold">{firstPosterCount}件</span>
            </div>
            <button
              onClick={onSelectFirstPoster}
              className="w-full text-sm bg-red-500 text-white hover:bg-red-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              スレ主を全選択
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">色:</span>
              {['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#000000'].map(color => (
                <button
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
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex-1 text-xs px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
              canUndo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="font-bold">戻す</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex-1 text-xs px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
              canRedo
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
            <span className="font-bold">やり直す</span>
          </button>
        </div>

        {/* レス名設定 */}
        <div className="space-y-2 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-600">レス名</h4>
          <input
            type="text"
            value={customName}
            onChange={(e) => onCustomNameChange(e.target.value)}
            placeholder="名無しさん"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customNameBold}
                onChange={(e) => onCustomNameBoldChange(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-700">太字</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">色:</span>
              <input
                type="color"
                value={customNameColor}
                onChange={(e) => onCustomNameColorChange(e.target.value)}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer"
                style={{ padding: '2px' }}
              />
            </div>
          </div>
          {customName && (
            <button
              onClick={() => onCustomNameChange('')}
              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              リセット
            </button>
          )}
        </div>

        {/* ショートカット - 折りたたみ可能 */}
        <div className="pt-3 border-t border-gray-100">
          <button
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
          </button>
          {showShortcuts && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">Space</kbd>
                <span className="text-gray-500">選択</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+E</kbd>
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
