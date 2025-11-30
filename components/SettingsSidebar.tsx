'use client';

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
}: SettingsSidebarProps) {
  // スレ主のID
  const firstPosterId = comments[0]?.name_id;
  // スレ主のコメント数を取得
  const firstPosterCount = firstPosterId ? comments.filter(c => c.name_id === firstPosterId).length : 0;

  return (
    <div className="w-64 flex-shrink-0">
      <div className="sticky top-4 bg-white rounded-2xl border border-orange-200 p-4 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          設定
        </h3>

        {/* レス名設定 */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">レス名</h4>
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
              <span className="text-sm text-gray-700">色:</span>
              <input
                type="color"
                value={customNameColor}
                onChange={(e) => onCustomNameColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
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

        {/* スレ主操作 */}
        {firstPosterId && firstPosterCount > 1 && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              スレ主（{firstPosterCount}件）
            </h4>
            <button
              onClick={onSelectFirstPoster}
              className="w-full text-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
            >
              全選択
            </button>
            <div className="space-y-2">
              <span className="text-xs text-gray-600">色を一括変更:</span>
              <div className="flex gap-2">
                {['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#000000'].map(color => (
                  <button
                    key={color}
                    onClick={() => onChangeFirstPosterColor(color)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all cursor-pointer"
                    style={{ backgroundColor: color }}
                    title="スレ主の色を変更"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
