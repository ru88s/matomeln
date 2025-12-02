'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import HelpModal from '@/components/HelpModal';
import SettingsModal from '@/components/SettingsModal';

export default function Header() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // 開発者モードを読み込み
  useEffect(() => {
    const savedDevMode = localStorage.getItem('matomeln_dev_mode');
    if (savedDevMode === 'true') {
      setIsDevMode(true);
    }
  }, []);

  // 開発者モード変更時にlocalStorageを更新
  const handleDevModeChange = (enabled: boolean) => {
    setIsDevMode(enabled);
    if (enabled) {
      localStorage.setItem('matomeln_dev_mode', 'true');
    } else {
      localStorage.removeItem('matomeln_dev_mode');
    }
    // ページ全体に開発者モードの変更を通知
    window.dispatchEvent(new CustomEvent('devModeChange', { detail: enabled }));
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
                onClick={() => setShowSettingsModal(true)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>⚙️</span>
                <span>設定</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* モーダル */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDevMode={isDevMode}
        onDevModeChange={handleDevModeChange}
      />
    </>
  );
}
