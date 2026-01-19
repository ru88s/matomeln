'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BlogSettings, ThumbnailCharacter, BlogType } from '@/lib/types';
import { generateThumbnail, base64ToDataUrl } from '@/lib/ai-thumbnail';
import { useIsAdmin } from '@/lib/auth-context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 開発者モード（管理者なら自動でtrue）
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
  const isAdmin = useIsAdmin();
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showClaudeApiKey, setShowClaudeApiKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogSettings | null>(null);
  const [blogForm, setBlogForm] = useState<{ name: string; blogId: string; apiKey: string; blogType: BlogType }>({ name: '', blogId: '', apiKey: '', blogType: 'livedoor' });
  const [thumbnailCharacters, setThumbnailCharacters] = useState<ThumbnailCharacter[]>([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ThumbnailCharacter | null>(null);
  const [characterForm, setCharacterForm] = useState({ name: '', description: '', imageUrl: '' });
  // 他のブログにも投稿設定
  const [postToOtherBlogs, setPostToOtherBlogs] = useState(false);
  const [selectedOtherBlogIds, setSelectedOtherBlogIds] = useState<string[]>([]);
  // テスト生成関連
  const [testGenerating, setTestGenerating] = useState<string | null>(null); // 生成中のキャラID
  const [testPreviewImage, setTestPreviewImage] = useState<string | null>(null);
  const [testPreviewCharacter, setTestPreviewCharacter] = useState<ThumbnailCharacter | null>(null);
  const [testTitle, setTestTitle] = useState('');
  // カスタムフッターHTML
  const [customFooterHtml, setCustomFooterHtml] = useState('');

  // 管理者なら開発者モードを自動で有効化
  useEffect(() => {
    if (isAdmin && !isDevMode) {
      onDevModeChange(true);
      localStorage.setItem('matomeln_dev_mode', 'true');
      window.dispatchEvent(new CustomEvent('devModeChanged'));
    }
  }, [isAdmin, isDevMode, onDevModeChange]);

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
      const savedCharacters = localStorage.getItem('matomeln_thumbnail_characters');
      if (savedCharacters) {
        try {
          setThumbnailCharacters(JSON.parse(savedCharacters));
        } catch {
          setThumbnailCharacters([]);
        }
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
      const savedFooterHtml = localStorage.getItem('matomeln_custom_footer_html');
      if (savedFooterHtml) {
        setCustomFooterHtml(savedFooterHtml);
      }
    }
  }, [isOpen]);

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
    toast.success('カスタムフッターHTMLを保存しました');
  };

  // 他のブログ一覧（選択中のブログを除く）
  const otherBlogs = blogs.filter(b => b.id !== selectedBlogId);

  // サンプルタイトル一覧
  const sampleTitles = [
    '【悲報】ワイ、彼女にフラれる',
    '【朗報】新作ゲームが神ゲーだと話題に',
    '【速報】有名YouTuberが結婚を発表',
    '【悲報】今日の晩ご飯がカレーじゃなかった',
    '【朗報】夏休みが来週から始まる',
  ];

  // テスト生成を実行
  const handleTestGenerate = async (character: ThumbnailCharacter, title: string) => {
    if (!geminiApiKey) {
      toast.error('Gemini APIキーを設定してください');
      return;
    }

    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }

    setTestGenerating(character.id);
    setTestPreviewImage(null);
    setTestPreviewCharacter(character);
    const toastId = toast.loading(`${character.name}でテスト生成中...`);

    try {
      const result = await generateThumbnail(geminiApiKey, title, character);

      if (result.success && result.imageBase64) {
        setTestPreviewImage(base64ToDataUrl(result.imageBase64));
        toast.success('テスト生成完了', { id: toastId });
      } else {
        toast.error(result.error || '生成に失敗しました', { id: toastId });
      }
    } catch (error) {
      toast.error('生成中にエラーが発生しました', { id: toastId });
    } finally {
      setTestGenerating(null);
    }
  };

  // キャラクター追加モーダルを開く
  const openAddCharacterModal = () => {
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', imageUrl: '' });
    setShowCharacterModal(true);
  };

  // キャラクター編集モーダルを開く
  const openEditCharacterModal = (character: ThumbnailCharacter) => {
    setEditingCharacter(character);
    setCharacterForm({
      name: character.name,
      description: character.description,
      imageUrl: '' // 追加欄は空にしておく
    });
    setShowCharacterModal(true);
  };

  // キャラクターを保存
  const saveCharacter = () => {
    if (!characterForm.name.trim()) {
      toast.error('キャラクター名を入力してください');
      return;
    }

    let updatedCharacters: ThumbnailCharacter[];

    if (editingCharacter) {
      // 編集
      updatedCharacters = thumbnailCharacters.map(c =>
        c.id === editingCharacter.id
          ? {
              ...c,
              name: characterForm.name,
              description: characterForm.description,
              referenceImageUrls: characterForm.imageUrl.trim()
                ? [characterForm.imageUrl.trim()]
                : c.referenceImageUrls
            }
          : c
      );
      toast.success('キャラクターを更新しました');
    } else {
      // 新規追加
      const newCharacter: ThumbnailCharacter = {
        id: crypto.randomUUID(),
        name: characterForm.name,
        description: characterForm.description,
        referenceImageUrls: characterForm.imageUrl.trim() ? [characterForm.imageUrl.trim()] : []
      };
      updatedCharacters = [...thumbnailCharacters, newCharacter];
      toast.success('キャラクターを追加しました');
    }

    setThumbnailCharacters(updatedCharacters);
    localStorage.setItem('matomeln_thumbnail_characters', JSON.stringify(updatedCharacters));
    setShowCharacterModal(false);
  };

  // キャラクターを削除
  const deleteCharacter = (id: string) => {
    const updatedCharacters = thumbnailCharacters.filter(c => c.id !== id);
    setThumbnailCharacters(updatedCharacters);
    localStorage.setItem('matomeln_thumbnail_characters', JSON.stringify(updatedCharacters));
    toast.success('キャラクターを削除しました');
    setShowCharacterModal(false);
  };

  // キャラクターに画像を追加
  const addImageToCharacter = (characterId: string, imageUrl: string) => {
    if (!imageUrl.trim()) return;

    const updatedCharacters = thumbnailCharacters.map(c =>
      c.id === characterId
        ? { ...c, referenceImageUrls: [...c.referenceImageUrls, imageUrl.trim()] }
        : c
    );
    setThumbnailCharacters(updatedCharacters);
    localStorage.setItem('matomeln_thumbnail_characters', JSON.stringify(updatedCharacters));
    toast.success('参考画像を追加しました');
  };

  // キャラクターから画像を削除
  const removeImageFromCharacter = (characterId: string, imageIndex: number) => {
    const updatedCharacters = thumbnailCharacters.map(c =>
      c.id === characterId
        ? { ...c, referenceImageUrls: c.referenceImageUrls.filter((_, i) => i !== imageIndex) }
        : c
    );
    setThumbnailCharacters(updatedCharacters);
    localStorage.setItem('matomeln_thumbnail_characters', JSON.stringify(updatedCharacters));
    // 編集中のキャラクターも更新（リアルタイム反映）
    if (editingCharacter && editingCharacter.id === characterId) {
      const updated = updatedCharacters.find(c => c.id === characterId);
      if (updated) {
        setEditingCharacter(updated);
      }
    }
    toast.success('参考画像を削除しました');
  };

  // ブログ追加モーダルを開く
  const openAddBlogModal = () => {
    setEditingBlog(null);
    setBlogForm({ name: '', blogId: '', apiKey: '', blogType: 'livedoor' });
    setShowBlogModal(true);
  };

  // ブログ編集モーダルを開く
  const openEditBlogModal = (blog: BlogSettings) => {
    setEditingBlog(blog);
    setBlogForm({ name: blog.name, blogId: blog.blogId, apiKey: blog.apiKey, blogType: blog.blogType || 'livedoor' });
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
          ? { ...b, name: blogForm.name, blogId: blogForm.blogId, apiKey: blogForm.apiKey, blogType: blogForm.blogType }
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
        blogType: blogForm.blogType,
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

            {/* カスタムフッターHTML */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">カスタムフッターHTML</h3>
              <textarea
                value={customFooterHtml}
                onChange={(e) => setCustomFooterHtml(e.target.value)}
                placeholder='例: <p style="color:gray;text-align:right;"><a href="https://shikutoku.me/" target="_blank">https://shikutoku.me/</a></p>'
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 h-20 resize-none font-mono"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  生成HTMLの最後に追加されます
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCustomFooterHtml('');
                      localStorage.removeItem('matomeln_custom_footer_html');
                      toast.success('カスタムフッターHTMLを削除しました');
                    }}
                    className="text-sm bg-gray-400 text-white hover:bg-gray-500 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    クリア
                  </button>
                  <button
                    onClick={saveCustomFooterHtml}
                    className="text-sm bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>

            {/* Claude API設定（管理者のみ） */}
            {isAdmin && (
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

            {/* Gemini API設定（管理者のみ） */}
            {isAdmin && (
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

                  {/* キャラクター管理 */}
                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-700">
                        参考キャラクター
                      </label>
                      <button
                        onClick={openAddCharacterModal}
                        className="text-xs bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                      >
                        + 追加
                      </button>
                    </div>

                    {thumbnailCharacters.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        キャラクターを追加するとサムネイル生成時に参考にされます
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {thumbnailCharacters.map((char) => (
                          <div
                            key={char.id}
                            className="bg-white rounded-lg p-2 border border-blue-100 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {char.referenceImageUrls[0] && (
                                <img
                                  src={char.referenceImageUrls[0]}
                                  alt={char.name}
                                  className="w-10 h-10 object-cover rounded cursor-pointer"
                                  onClick={() => openEditCharacterModal(char)}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditCharacterModal(char)}>
                                <div className="font-bold text-sm text-gray-800 truncate">{char.name}</div>
                                {char.description && (
                                  <div className="text-xs text-gray-500 truncate">{char.description}</div>
                                )}
                                <div className="text-xs text-blue-500">
                                  {char.referenceImageUrls.length}枚の参考画像
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTestPreviewCharacter(char);
                                  setTestPreviewImage(null);
                                  setTestTitle(sampleTitles[Math.floor(Math.random() * sampleTitles.length)]);
                                }}
                                disabled={testGenerating !== null}
                                className="text-xs bg-green-500 text-white hover:bg-green-600 px-2 py-1 rounded font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                テスト
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* テスト生成パネル */}
                    {testPreviewCharacter && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-green-700">
                            {testPreviewCharacter.name} でテスト生成
                          </span>
                          <button
                            onClick={() => {
                              setTestPreviewCharacter(null);
                              setTestPreviewImage(null);
                            }}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={testTitle}
                            onChange={(e) => setTestTitle(e.target.value)}
                            placeholder="テスト用タイトルを入力..."
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                          <div className="flex gap-1 flex-wrap">
                            {sampleTitles.slice(0, 3).map((title, i) => (
                              <button
                                key={i}
                                onClick={() => setTestTitle(title)}
                                className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate max-w-[120px]"
                              >
                                {title}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleTestGenerate(testPreviewCharacter, testTitle)}
                            disabled={testGenerating !== null || !testTitle.trim()}
                            className="w-full text-sm bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {testGenerating === testPreviewCharacter.id ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                生成中...
                              </>
                            ) : (
                              'サムネイルを生成'
                            )}
                          </button>
                          {testPreviewImage && (
                            <div className="mt-2">
                              <img
                                src={testPreviewImage}
                                alt="テスト生成結果"
                                className="w-full rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      推奨: 2-6枚/キャラ（多様なシチュエーションを含む画像がベスト）
                    </p>
                  </div>

                  <p className="text-xs text-blue-600">
                    記事タイトルからサムネイル画像を自動生成
                  </p>
                </div>
              </div>
            )}

            {/* 複数ブログ同時投稿（管理者 & 2つ以上のブログがある場合のみ） */}
            {isAdmin && blogs.length > 1 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-gray-800">複数ブログ同時投稿</h3>
                </div>

                <div className="space-y-3">
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
                      className="h-4 w-4 text-purple-500 focus:ring-purple-400 border-gray-300 rounded cursor-pointer"
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
                            className="h-4 w-4 text-purple-500 focus:ring-purple-400 border-gray-300 rounded cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">{blog.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-purple-600">
                    投稿時に選択したブログにも同じ内容が投稿されます
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
                  ブログタイプ
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBlogForm({ ...blogForm, blogType: 'livedoor' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-bold cursor-pointer transition-colors ${
                      blogForm.blogType === 'livedoor'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ライブドアブログ
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogForm({ ...blogForm, blogType: 'girls-matome' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-bold cursor-pointer transition-colors ${
                      blogForm.blogType === 'girls-matome'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ガールズまとめ
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示名
                </label>
                <input
                  type="text"
                  value={blogForm.name}
                  onChange={(e) => setBlogForm({ ...blogForm, name: e.target.value })}
                  placeholder={blogForm.blogType === 'girls-matome' ? 'ガールズまとめ速報' : 'マイブログ'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {blogForm.blogType === 'girls-matome' ? 'API URL' : 'ブログID'}
                </label>
                <input
                  type="text"
                  value={blogForm.blogId}
                  onChange={(e) => setBlogForm({ ...blogForm, blogId: e.target.value })}
                  placeholder={blogForm.blogType === 'girls-matome' ? 'https://girls-matome.example.com' : 'myblog'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blogForm.blogType === 'girls-matome'
                    ? 'ガールズまとめ速報のAPIエンドポイントURL'
                    : 'https://●●●.blog.jp の ●●● 部分'}
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

      {/* キャラクター設定モーダル */}
      {showCharacterModal && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                {editingCharacter ? 'キャラクターを編集' : 'キャラクターを追加'}
              </h3>
              <button
                onClick={() => setShowCharacterModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キャラクター名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                  placeholder="例: やる子"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キャラ説明（プロンプト用）
                </label>
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                  placeholder="例: 金髪ボブカットにリボン、明るい表情、アニメ風イラスト"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 h-20 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  日本語OK。キャラの見た目や雰囲気を記述
                </p>
              </div>

              {/* 参考画像管理 */}
              {editingCharacter && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参考画像URL
                  </label>
                  <p className="text-xs text-amber-600 mb-2">
                    重要: 必ず大きい画像（-sなし）のURLを使用してください
                  </p>

                  {/* 既存の画像一覧 */}
                  {editingCharacter.referenceImageUrls.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {editingCharacter.referenceImageUrls.map((url, index) => (
                        <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                          <img
                            src={url}
                            alt={`参考画像 ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23f3f4f6" width="64" height="64"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">Error</text></svg>';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={url}
                              readOnly
                              className="w-full text-xs px-2 py-1 bg-white border border-gray-200 rounded truncate"
                            />
                          </div>
                          <button
                            onClick={() => removeImageFromCharacter(editingCharacter.id, index)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 新しい画像を追加 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={characterForm.imageUrl}
                      onChange={(e) => setCharacterForm({ ...characterForm, imageUrl: e.target.value })}
                      placeholder="https://livedoor.blogimg.jp/.../image.png"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => {
                        if (characterForm.imageUrl.trim()) {
                          addImageToCharacter(editingCharacter.id, characterForm.imageUrl);
                          setCharacterForm({ ...characterForm, imageUrl: '' });
                          // 編集中のキャラクターを更新
                          const updated = thumbnailCharacters.find(c => c.id === editingCharacter.id);
                          if (updated) {
                            setEditingCharacter({ ...updated, referenceImageUrls: [...updated.referenceImageUrls, characterForm.imageUrl.trim()] });
                          }
                        }
                      }}
                      className="text-sm bg-blue-500 text-white hover:bg-blue-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      追加
                    </button>
                  </div>
                </div>
              )}

              {/* 新規作成時の初期画像URL */}
              {!editingCharacter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    参考画像URL（最初の1枚）
                  </label>
                  <input
                    type="text"
                    value={characterForm.imageUrl}
                    onChange={(e) => setCharacterForm({ ...characterForm, imageUrl: e.target.value })}
                    placeholder="https://livedoor.blogimg.jp/.../image.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    追加の画像は保存後に登録できます
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {editingCharacter && (
                  <button
                    onClick={() => deleteCharacter(editingCharacter.id)}
                    className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    削除
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowCharacterModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveCharacter}
                  className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-bold cursor-pointer transition-colors"
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
