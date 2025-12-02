'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BlogSettings } from '@/lib/types';

// 開発者モードのパスワード
const DEV_MODE_PASSWORD = 'matomeln2025';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 開発者モード
  isDevMode: boolean;
  onDevModeChange: (enabled: boolean) => void;
  // レス名設定
  customName: string;
  onCustomNameChange: (name: string) => void;
  customNameBold: boolean;
  onCustomNameBoldChange: (bold: boolean) => void;
  customNameColor: string;
  onCustomNameColorChange: (color: string) => void;
  // HTML出力設定
  showIdInHtml: boolean;
  onShowIdInHtmlChange: (show: boolean) => void;
  // ブログ設定
  blogs: BlogSettings[];
  selectedBlogId: string | null;
  onBlogsChange: (blogs: BlogSettings[]) => void;
  onSelectedBlogIdChange: (id: string | null) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  isDevMode,
  onDevModeChange,
  customName,
  onCustomNameChange,
  customNameBold,
  onCustomNameBoldChange,
  customNameColor,
  onCustomNameColorChange,
  showIdInHtml,
  onShowIdInHtmlChange,
  blogs,
  selectedBlogId,
  onBlogsChange,
  onSelectedBlogIdChange,
}: SettingsModalProps) {
  const [showDevModeInput, setShowDevModeInput] = useState(false);
  const [devModePassword, setDevModePassword] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showClaudeApiKey, setShowClaudeApiKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogSettings | null>(null);
  const [blogForm, setBlogForm] = useState({ name: '', blogId: '', apiKey: '' });

  // 設定を読み込み
  useEffect(() => {
    if (isOpen) {
      const savedClaudeApiKey = localStorage.getItem('matomeln_claude_api_key');
      if (savedClaudeApiKey) {
        setClaudeApiKey(savedClaudeApiKey);
      }
      const savedGeminiApiKey = localStorage.getItem('matomeln_gemini_api_key');
      if (savedGeminiApiKey) {
        setGeminiApiKey(savedGeminiApiKey);
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
      toast.success('Claude APIキーを保存しました');
    } else {
      localStorage.removeItem('matomeln_claude_api_key');
      toast.success('Claude APIキーを削除しました');
    }
  };

  // Gemini APIキーを保存
  const saveGeminiApiKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem('matomeln_gemini_api_key', geminiApiKey.trim());
      toast.success('Gemini APIキーを保存しました');
    } else {
      localStorage.removeItem('matomeln_gemini_api_key');
      toast.success('Gemini APIキーを削除しました');
    }
  };

  // ブログ追加モーダルを開く
  const openAddBlogModal = () => {
    setEditingBlog(null);
    setBlogForm({ name: '', blogId: '', apiKey: '' });
    setShowBlogModal(true);
  };

  // ブログ編集モーダルを開く
  const openEditBlogModal = (blog: BlogSettings) => {
    setEditingBlog(blog);
    setBlogForm({ name: blog.name, blogId: blog.blogId, apiKey: blog.apiKey });
    setShowBlogModal(true);
  };

  // ブログを保存
  const saveBlog = () => {
    if (!blogForm.name.trim() || !blogForm.blogId.trim() || !blogForm.apiKey.trim()) {
      toast.error('すべての項目を入力してください');
      return;
    }

    if (editingBlog) {
      // 編集
      const updated = blogs.map(b =>
        b.id === editingBlog.id
          ? { ...b, name: blogForm.name, blogId: blogForm.blogId, apiKey: blogForm.apiKey }
          : b
      );
      onBlogsChange(updated);
      toast.success('ブログ設定を更新しました');
    } else {
      // 新規追加
      const newBlog: BlogSettings = {
        id: crypto.randomUUID(),
        name: blogForm.name,
        blogId: blogForm.blogId,
        apiKey: blogForm.apiKey,
      };
      onBlogsChange([...blogs, newBlog]);
      onSelectedBlogIdChange(newBlog.id);
      toast.success('ブログを追加しました');
    }
    setShowBlogModal(false);
  };

  // ブログを削除
  const deleteBlog = (id: string) => {
    const updated = blogs.filter(b => b.id !== id);
    onBlogsChange(updated);
    if (selectedBlogId === id) {
      onSelectedBlogIdChange(updated.length > 0 ? updated[0].id : null);
    }
    toast.success('ブログを削除しました');
    setShowBlogModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
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
            {/* レス名設定 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">レス名</h3>
                {customName && (
                  <button
                    onClick={() => onCustomNameChange('')}
                    className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    リセット
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customName}
                onChange={(e) => onCustomNameChange(e.target.value)}
                placeholder="名無しさん"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent mb-3"
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
            </div>

            {/* HTML出力設定 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">HTML出力設定</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIdInHtml}
                  onChange={(e) => onShowIdInHtmlChange(e.target.checked)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-700">IDを表示</span>
              </label>
            </div>

            {/* ブログ設定 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">ブログ設定</h3>
              {blogs.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedBlogId || ''}
                    onChange={(e) => onSelectedBlogIdChange(e.target.value || null)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent cursor-pointer"
                  >
                    {blogs.map(blog => (
                      <option key={blog.id} value={blog.id}>{blog.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={openAddBlogModal}
                      className="flex-1 text-xs bg-green-500 text-white hover:bg-green-600 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      + 追加
                    </button>
                    <button
                      onClick={() => {
                        const blog = blogs.find(b => b.id === selectedBlogId);
                        if (blog) openEditBlogModal(blog);
                      }}
                      disabled={!selectedBlogId}
                      className="flex-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      編集
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openAddBlogModal}
                  className="w-full text-sm bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  + ブログを追加
                </button>
              )}
              <p className="text-xs text-gray-500 mt-2">
                ライブドアブログのAPI設定を登録できます
              </p>
            </div>

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
                    <button
                    onClick={() => setShowDevModeInput(true)}
                    className="text-sm bg-purple-500 text-white hover:bg-purple-600 px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    有効にする
                  </button>
                  )}
                </div>
              )}
            </div>

            {/* Claude API設定（開発者モード時のみ） */}
            {isDevMode && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-gray-800">Claude API</h3>
                  <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">AIまとめ</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      APIキー
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showClaudeApiKey ? 'text' : 'password'}
                          value={claudeApiKey}
                          onChange={(e) => setClaudeApiKey(e.target.value)}
                          placeholder="sk-ant-api03-..."
                          className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClaudeApiKey(!showClaudeApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showClaudeApiKey ? (
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

                  <p className="text-xs text-purple-600">
                    レスを自動選択・色付けするAIまとめ機能に使用
                  </p>
                </div>
              </div>
            )}

            {/* Gemini API設定（開発者モード時のみ） */}
            {isDevMode && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-gray-800">Gemini API</h3>
                  <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">AIサムネイル</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      APIキー
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showGeminiApiKey ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showGeminiApiKey ? (
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
                        onClick={saveGeminiApiKey}
                        className="text-sm bg-blue-500 text-white hover:bg-blue-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-blue-600">
                    記事タイトルからサムネイル画像を自動生成
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ブログ設定モーダル */}
      {showBlogModal && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 id="blog-modal-title" className="font-bold text-gray-900">
                {editingBlog ? 'ブログを編集' : 'ブログを追加'}
              </h3>
              <button
                onClick={() => setShowBlogModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label="閉じる"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示名
                </label>
                <input
                  type="text"
                  value={blogForm.name}
                  onChange={(e) => setBlogForm({ ...blogForm, name: e.target.value })}
                  placeholder="マイブログ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ブログID
                </label>
                <input
                  type="text"
                  value={blogForm.blogId}
                  onChange={(e) => setBlogForm({ ...blogForm, blogId: e.target.value })}
                  placeholder="myblog"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  https://●●●.blog.jp の ●●● 部分
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  APIキー
                </label>
                <input
                  type="password"
                  value={blogForm.apiKey}
                  onChange={(e) => setBlogForm({ ...blogForm, apiKey: e.target.value })}
                  placeholder="APIキー"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {editingBlog && (
                  <button
                    onClick={() => deleteBlog(editingBlog.id)}
                    className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    削除
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowBlogModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveBlog}
                  className="px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
