'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import HelpModal from '@/components/HelpModal';

export default function Header() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // 開発者モードの状態を監視
  useEffect(() => {
    const checkDevMode = () => {
      const savedDevMode = localStorage.getItem('matomeln_dev_mode');
      setIsDevMode(savedDevMode === 'true');
    };

    // 初期チェック
    checkDevMode();

    // localStorageの変更を監視
    const handleStorageChange = () => {
      checkDevMode();
    };

    window.addEventListener('storage', handleStorageChange);
    // カスタムイベントでも更新を受け取る
    window.addEventListener('devModeChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('devModeChanged', handleStorageChange);
    };
  }, []);

  // 設定モーダルを開くイベントを発火
  const openSettingsModal = () => {
    window.dispatchEvent(new CustomEvent('openSettingsModal'));
  };

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Logo />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  まとめるん
                </span>
                <span className="text-[10px] text-gray-400 font-normal ml-1">Beta</span>
              </a>
              {isDevMode && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded-full">
                  DEV
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHelpModal(true)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>💡</span>
                <span>使い方</span>
              </button>
              <button
                onClick={openSettingsModal}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>⚙️</span>
                <span>設定</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 使い方モーダル */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
