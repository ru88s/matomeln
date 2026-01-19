'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BlogSettings } from '@/lib/types';
import { useIsAdmin } from '@/lib/auth-context';

export default function SettingsPage() {
  const isAdmin = useIsAdmin();
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  // ブログ設定
  const [blogs, setBlogs] = useState<BlogSettings[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  // 他のブログにも投稿設定
  const [postToOtherBlogs, setPostToOtherBlogs] = useState(false);
  const [selectedOtherBlogIds, setSelectedOtherBlogIds] = useState<string[]>([]);
  // カスタムフッターHTML
  const [customFooterHtml, setCustomFooterHtml] = useState('');

  // 管理者なら開発者モードを自動で有効化
  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('matomeln_dev_mode', 'true');
      window.dispatchEvent(new CustomEvent('devModeChanged'));
    }
  }, [isAdmin]);

  // 設定を読み込み
  useEffect(() => {
    const savedApiKey = localStorage.getItem('matomeln_claude_api_key');
    if (savedApiKey) {
      setClaudeApiKey(savedApiKey);
    }
    // ブログ設定を読み込み
    const savedBlogs = localStorage.getItem('matomeln_blogs');
    if (savedBlogs) {
      try {
        setBlogs(JSON.parse(savedBlogs));
      } catch {
        // パースエラーは無視
      }
    }
    const savedSelectedBlogId = localStorage.getItem('matomeln_selected_blog');
    if (savedSelectedBlogId) {
      setSelectedBlogId(savedSelectedBlogId);
    }
    // 他のブログにも投稿設定を読み込み
    const savedOtherBlogsSettings = localStorage.getItem('matomeln_other_blogs_settings');
    if (savedOtherBlogsSettings) {
      try {
        const settings = JSON.parse(savedOtherBlogsSettings);
        setPostToOtherBlogs(settings.postToOtherBlogs || false);
        setSelectedOtherBlogIds(settings.selectedOtherBlogIds || []);
      } catch {
        // パースエラーは無視
      }
    }
    // カスタムフッターHTMLを読み込み
    const savedCustomFooter = localStorage.getItem('matomeln_custom_footer_html');
    if (savedCustomFooter) {
      setCustomFooterHtml(savedCustomFooter);
    }
  }, []);

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

  // 他のブログにも投稿設定を保存
  const saveOtherBlogsSettings = (newPostToOtherBlogs: boolean, newSelectedOtherBlogIds: string[]) => {
    setPostToOtherBlogs(newPostToOtherBlogs);
    setSelectedOtherBlogIds(newSelectedOtherBlogIds);
    localStorage.setItem('matomeln_other_blogs_settings', JSON.stringify({
      postToOtherBlogs: newPostToOtherBlogs,
      selectedOtherBlogIds: newSelectedOtherBlogIds,
    }));
  };

  // カスタムフッターHTMLを保存
  const saveCustomFooterHtml = () => {
    localStorage.setItem('matomeln_custom_footer_html', customFooterHtml);
    toast.success('フッターHTMLを保存しました');
  };

  // 現在選択中のブログを取得
  const selectedBlog = blogs.find(b => b.id === selectedBlogId);
  // 他のブログ一覧（選択中のブログを除く）
  const otherBlogs = blogs.filter(b => b.id !== selectedBlogId);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="space-y-6">
        {/* 管理者ステータス */}
        {isAdmin && (
          <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-purple-800 font-bold">管理者としてログイン中</span>
            </div>
            <p className="text-sm text-purple-600 mt-2">
              AIまとめ機能・一括処理など全ての機能が利用可能です。
            </p>
          </div>
        )}

        {/* Claude API設定（管理者のみ） */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">Claude API設定</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APIキー
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showApiKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={saveClaudeApiKey}
                    className="bg-purple-500 text-white hover:bg-purple-600 px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    保存
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Anthropic ConsoleでAPIキーを取得してください。ローカルに保存されます。
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-purple-800 mb-2">AIまとめ機能について</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>・Claude Haiku 4.5を使用してレスを自動選択</li>
                  <li>・色（赤/青/緑）とサイズを自動で装飾</li>
                  <li>・アンカー先も自動追加</li>
                  <li>・1回あたり約¥1-3程度の料金がかかります</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 他のブログにも投稿（管理者のみ） */}
        {isAdmin && blogs.length > 1 && (
          <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">複数ブログ同時投稿</h2>
            </div>

            <div className="space-y-4">
              {selectedBlog && (
                <div className="text-sm text-gray-600">
                  メインブログ: <span className="font-bold text-gray-800">{selectedBlog.name}</span>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postToOtherBlogs}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    if (!newValue) {
                      saveOtherBlogsSettings(false, []);
                    } else {
                      saveOtherBlogsSettings(true, selectedOtherBlogIds);
                    }
                  }}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm font-bold text-purple-700">他のブログにも同時投稿する</span>
              </label>

              {postToOtherBlogs && otherBlogs.length > 0 && (
                <div className="space-y-2 pl-6">
                  {otherBlogs.map(blog => (
                    <label key={blog.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOtherBlogIds.includes(blog.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...selectedOtherBlogIds, blog.id]
                            : selectedOtherBlogIds.filter(id => id !== blog.id);
                          saveOtherBlogsSettings(true, newIds);
                        }}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm text-gray-700">{blog.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {postToOtherBlogs && otherBlogs.length === 0 && (
                <p className="text-sm text-gray-500 pl-6">
                  他にブログが登録されていません。メイン画面のサイドバーからブログを追加してください。
                </p>
              )}

              <div className="bg-purple-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-700">
                  投稿時に選択したブログにも同じ内容が投稿されます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* カスタムフッターHTML */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">カスタムフッターHTML</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                生成HTMLの末尾に追加するHTML
              </label>
              <textarea
                value={customFooterHtml}
                onChange={(e) => setCustomFooterHtml(e.target.value)}
                placeholder={'<p style="color:gray;text-align:right;"><a href="https://example.com/" target="_blank">https://example.com/</a></p>'}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                HTMLタグをそのまま記述してください。引用元リンクなどに使用できます。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCustomFooterHtml('');
                  localStorage.removeItem('matomeln_custom_footer_html');
                  toast.success('フッターHTMLを削除しました');
                }}
                className="bg-gray-400 text-white hover:bg-gray-500 px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors"
              >
                クリア
              </button>
              <button
                onClick={saveCustomFooterHtml}
                className="bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>

        {/* その他の設定 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">その他</h2>
          <p className="text-sm text-gray-500">
            ブログ設定はメイン画面のサイドバーから行えます。
          </p>
        </div>
      </div>
    </div>
  );
}
