'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// 開発者モードのパスワード
const DEV_MODE_PASSWORD = 'matomeln2025';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDevMode: boolean;
  onDevModeChange: (enabled: boolean) => void;
}

export default function SettingsModal({ isOpen, onClose, isDevMode, onDevModeChange }: SettingsModalProps) {
  const [showDevModeInput, setShowDevModeInput] = useState(false);
  const [devModePassword, setDevModePassword] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // 設定を読み込み
  useEffect(() => {
    if (isOpen) {
      const savedApiKey = localStorage.getItem('matomeln_claude_api_key');
      if (savedApiKey) {
        setClaudeApiKey(savedApiKey);
      }
    }
  }, [isOpen]);

  // 開発者モードのパスワード検証
  const verifyDevModePassword = () => {
    if (devModePassword === DEV_MODE_PASSWORD) {
      onDevModeChange(true);
      localStorage.setItem('matomeln_dev_mode', 'true');
      toast.success('開発者モードを有効にしました');
      setShowDevModeInput(false);
      setDevModePassword('');
    } else {
      toast.error('パスワードが正しくありません');
    }
  };

  // 開発者モードを無効化
  const disableDevMode = () => {
    onDevModeChange(false);
    localStorage.removeItem('matomeln_dev_mode');
    toast.success('開発者モードを無効にしました');
  };

  // Claude APIキーを保存
  const saveClaudeApiKey = () => {
    if (claudeApiKey.trim()) {
      localStorage.setItem('matomeln_claude_api_key', claudeApiKey.trim());
      toast.success('APIキーを保存しました');
    } else {
      localStorage.removeItem('matomeln_claude_api_key');
      toast.success('APIキーを削除しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>⚙️</span>
            設定
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 max-h-[calc(85vh-70px)] overflow-y-auto space-y-4">
          {/* 開発者モード */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3">開発者モード</h3>

            {isDevMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-bold text-sm">有効</span>
                  </div>
                  <button
                    onClick={disableDevMode}
                    className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    無効にする
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  AIまとめ機能が利用可能です。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {showDevModeInput ? (
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={devModePassword}
                      onChange={(e) => setDevModePassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') verifyDevModePassword();
                        if (e.key === 'Escape') {
                          setShowDevModeInput(false);
                          setDevModePassword('');
                        }
                      }}
                      placeholder="パスワードを入力"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={verifyDevModePassword}
                        className="flex-1 text-sm bg-purple-500 text-white hover:bg-purple-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        有効化
                      </button>
                      <button
                        onClick={() => {
                          setShowDevModeInput(false);
                          setDevModePassword('');
                        }}
                        className="flex-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      AIまとめ機能など追加機能が利用できます。
                    </p>
                    <button
                      onClick={() => setShowDevModeInput(true)}
                      className="text-sm bg-purple-500 text-white hover:bg-purple-600 px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      有効にする
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Claude API設定（開発者モード時のみ） */}
          {isDevMode && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-gray-800">Claude API</h3>
                <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">開発者専用</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    APIキー
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={claudeApiKey}
                        onChange={(e) => setClaudeApiKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showApiKey ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={saveClaudeApiKey}
                      className="text-sm bg-purple-500 text-white hover:bg-purple-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="text-xs font-bold text-purple-800 mb-1">AIまとめ機能</p>
                  <ul className="text-xs text-purple-700 space-y-0.5">
                    <li>• Claude Haiku 4.5でレスを自動選択</li>
                    <li>• 色とサイズを自動設定</li>
                    <li>• 1回あたり約¥1-3程度</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* その他 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2">ブログ設定</h3>
            <p className="text-xs text-gray-500">
              ブログの追加・編集はメイン画面のサイドバーから行えます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
