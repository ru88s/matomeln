'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import HelpModal from '@/components/HelpModal';
import { useAuth, useIsAdmin } from '@/lib/auth-context';

export default function Header() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const { user, loading, logout } = useAuth();
  const isAdmin = useIsAdmin();

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
              {isAdmin && isDevMode && (
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

              {/* User info and logout */}
              {!loading && user && (
                <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
                  <div className="flex items-center gap-2">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || user.email}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 hidden sm:inline">
                      {user.name || user.email.split('@')[0]}
                    </span>
                    {user.role === 'admin' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 使い方モーダル */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
