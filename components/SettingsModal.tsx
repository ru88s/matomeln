'use client';

import { HeroButton, HeroTextArea, HeroSelect, HeroInput } from '@/components/ui/HeroControls';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BlogSettings, ThumbnailCharacter, BlogType, ThumbnailProvider, OpenAIImageModel, OpenAIImageQuality } from '@/lib/types';
import { generateThumbnail, generateThumbnailWithOpenAI, base64ToDataUrl } from '@/lib/ai-thumbnail';
import { useIsAdmin } from '@/lib/auth-context';
import { LIFE_BLOG_ROUTING_BADGE, isLifestyleBlog, normalizeOtherBlogSelectionSettings } from '@/lib/blog-routing';

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
  // サーバー同期
  onSaveSettings?: (updates: Record<string, string | null>) => void;
  onOtherBlogSettingsChange?: (settings: { postToOtherBlogs: boolean; selectedOtherBlogIds: string[] }) => void;
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
  onSaveSettings,
  onOtherBlogSettingsChange,
}: SettingsModalProps) {
  const isAdmin = useIsAdmin();
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showClaudeApiKey, setShowClaudeApiKey] = useState(false);
  const [aiSummaryProvider, setAiSummaryProvider] = useState<'claude' | 'ollama'>('claude');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState('gemma4:e4b');
  const [imageModerationEnabled, setImageModerationEnabled] = useState(true);
  const [imageModerationModel, setImageModerationModel] = useState('gemma3:4b');
  const [aiInputMode, setAiInputMode] = useState<'standard' | 'token-saving'>('standard');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);
  const [thumbnailEnabled, setThumbnailEnabled] = useState(true);
  const [thumbnailProvider, setThumbnailProvider] = useState<ThumbnailProvider>('gemini');
  const [openaiImageModel, setOpenaiImageModel] = useState<OpenAIImageModel>('gpt-image-1');
  const [openaiImageQuality, setOpenaiImageQuality] = useState<OpenAIImageQuality>('medium');
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogSettings | null>(null);
  const [blogForm, setBlogForm] = useState<{ name: string; blogId: string; apiUsername: string; apiKey: string; blogType: BlogType; disabled: boolean }>({ name: '', blogId: '', apiUsername: '', apiKey: '', blogType: 'livedoor', disabled: false });
  const [thumbnailCharacters, setThumbnailCharacters] = useState<ThumbnailCharacter[]>([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ThumbnailCharacter | null>(null);
  const [characterForm, setCharacterForm] = useState({ name: '', description: '', imageUrl: '' });
  // 他のブログにも投稿設定
  const [postToOtherBlogs, setPostToOtherBlogs] = useState(false);
  const [selectedOtherBlogIds, setSelectedOtherBlogIds] = useState<string[]>([]);
  const [blogTestResults, setBlogTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testingBlogId, setTestingBlogId] = useState<string | null>(null);
  // テスト生成関連
  const [testGenerating, setTestGenerating] = useState<string | null>(null); // 生成中のキャラID
  const [testPreviewImage, setTestPreviewImage] = useState<string | null>(null);
  const [testPreviewCharacter, setTestPreviewCharacter] = useState<ThumbnailCharacter | null>(null);
  const [testTitle, setTestTitle] = useState('');
  // カスタムフッターHTML
  const [customFooterHtml, setCustomFooterHtml] = useState('');

  const selectBlogType = (blogType: BlogType) => {
    setBlogForm((current) => ({
      ...current,
      blogType,
      blogId: blogType === 'kotoria' && !current.blogId.trim() ? 'https://kotoria.me' : current.blogId,
    }));
  };

  // localStorage書き込み + サーバー同期のヘルパー
  const persistSettings = useCallback((updates: Record<string, string | null>) => {
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }
    onSaveSettings?.(updates);
  }, [onSaveSettings]);

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
      const savedAiSummaryProvider = localStorage.getItem('matomeln_ai_summary_provider');
      if (savedAiSummaryProvider === 'claude' || savedAiSummaryProvider === 'ollama') {
        setAiSummaryProvider(savedAiSummaryProvider);
      }
      setOllamaEndpoint(localStorage.getItem('matomeln_ollama_endpoint') || 'http://127.0.0.1:11434');
      setOllamaModel(localStorage.getItem('matomeln_ollama_model') || 'gemma4:e4b');
      setImageModerationEnabled(localStorage.getItem('matomeln_image_moderation_enabled') !== 'false');
      setImageModerationModel(localStorage.getItem('matomeln_image_moderation_model') || 'gemma3:4b');
      setAiInputMode(localStorage.getItem('matomeln_ai_input_mode') === 'token-saving' ? 'token-saving' : 'standard');
      const savedGeminiApiKey = localStorage.getItem('matomeln_gemini_api_key');
      if (savedGeminiApiKey) {
        setGeminiApiKey(savedGeminiApiKey);
      }
      const savedOpenaiApiKey = localStorage.getItem('matomeln_openai_api_key');
      if (savedOpenaiApiKey) {
        setOpenaiApiKey(savedOpenaiApiKey);
      }
      const savedThumbnailEnabled = localStorage.getItem('matomeln_thumbnail_enabled');
      if (savedThumbnailEnabled === 'false') {
        setThumbnailEnabled(false);
      }
      const savedProvider = localStorage.getItem('matomeln_thumbnail_provider') as ThumbnailProvider | null;
      if (savedProvider === 'gemini' || savedProvider === 'openai') {
        setThumbnailProvider(savedProvider);
      }
      const savedModel = localStorage.getItem('matomeln_openai_image_model') as OpenAIImageModel | null;
      if (savedModel === 'gpt-image-1' || savedModel === 'gpt-image-1-mini') {
        setOpenaiImageModel(savedModel);
      }
      const savedQuality = localStorage.getItem('matomeln_openai_image_quality') as OpenAIImageQuality | null;
      if (savedQuality === 'low' || savedQuality === 'medium' || savedQuality === 'high') {
        setOpenaiImageQuality(savedQuality);
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
          const normalizedOtherBlogsSettings = normalizeOtherBlogSelectionSettings(savedOtherBlogsSettings) || savedOtherBlogsSettings;
          if (normalizedOtherBlogsSettings !== savedOtherBlogsSettings) {
            localStorage.setItem('matomeln_other_blogs_settings', normalizedOtherBlogsSettings);
          }
          const settings = JSON.parse(normalizedOtherBlogsSettings);
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
      persistSettings({ matomeln_claude_api_key: claudeApiKey.trim() });
      toast.success('Claude APIキーを保存しました');
    } else {
      persistSettings({ matomeln_claude_api_key: null });
      toast.success('Claude APIキーを削除しました');
    }
  };

  // Gemini APIキーを保存
  const saveGeminiApiKey = () => {
    if (geminiApiKey.trim()) {
      persistSettings({ matomeln_gemini_api_key: geminiApiKey.trim() });
      toast.success('Gemini APIキーを保存しました');
    } else {
      persistSettings({ matomeln_gemini_api_key: null });
      toast.success('Gemini APIキーを削除しました');
    }
  };

  // OpenAI APIキーを保存
  const saveOpenaiApiKey = () => {
    if (openaiApiKey.trim()) {
      persistSettings({ matomeln_openai_api_key: openaiApiKey.trim() });
      toast.success('OpenAI APIキーを保存しました');
    } else {
      persistSettings({ matomeln_openai_api_key: null });
      toast.success('OpenAI APIキーを削除しました');
    }
  };

  // サムネイルプロバイダーを保存
  const saveThumbnailProvider = (provider: ThumbnailProvider) => {
    setThumbnailProvider(provider);
    persistSettings({ matomeln_thumbnail_provider: provider });
    toast.success(`サムネイルプロバイダーを${provider === 'gemini' ? 'Gemini' : 'OpenAI'}に変更しました`);
  };

  // OpenAIモデルを保存
  const saveOpenaiImageModel = (model: OpenAIImageModel) => {
    setOpenaiImageModel(model);
    persistSettings({ matomeln_openai_image_model: model });
  };

  // OpenAI品質を保存
  const saveOpenaiImageQuality = (quality: OpenAIImageQuality) => {
    setOpenaiImageQuality(quality);
    persistSettings({ matomeln_openai_image_quality: quality });
  };

  // 他のブログにも投稿設定を保存
  const saveOtherBlogsSettings = (newPostToOtherBlogs: boolean, newSelectedOtherBlogIds: string[]) => {
    setPostToOtherBlogs(newPostToOtherBlogs);
    setSelectedOtherBlogIds(newSelectedOtherBlogIds);
    const settings = {
      postToOtherBlogs: newPostToOtherBlogs,
      selectedOtherBlogIds: newSelectedOtherBlogIds,
    };
    persistSettings({ matomeln_other_blogs_settings: JSON.stringify(settings) });
    onOtherBlogSettingsChange?.(settings);
  };

  const testBlogConnection = async (blog: BlogSettings) => {
    setTestingBlogId(blog.id);
    setBlogTestResults(prev => ({ ...prev, [blog.id]: { ok: false, message: '確認中...' } }));

    try {
      const response = await fetch('/api/proxy/testBlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: blog.blogId,
          apiUsername: blog.apiUsername,
          apiKey: blog.apiKey,
          blogType: blog.blogType || 'livedoor',
        }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      setBlogTestResults(prev => ({
        ...prev,
        [blog.id]: {
          ok: result.ok === true,
          message: result.message || (result.ok ? '正常' : '接続NG'),
        },
      }));
    } catch {
      setBlogTestResults(prev => ({ ...prev, [blog.id]: { ok: false, message: '接続NG' } }));
    } finally {
      setTestingBlogId(null);
    }
  };

  // カスタムフッターHTMLを保存
  const saveCustomFooterHtml = () => {
    persistSettings({ matomeln_custom_footer_html: customFooterHtml });
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
    const useOpenAI = thumbnailProvider === 'openai';
    const activeApiKey = useOpenAI ? openaiApiKey : geminiApiKey;

    if (!activeApiKey) {
      toast.error(useOpenAI ? 'OpenAI APIキーを設定してください' : 'Gemini APIキーを設定してください');
      return;
    }

    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }

    setTestGenerating(character.id);
    setTestPreviewImage(null);
    setTestPreviewCharacter(character);
    const providerLabel = useOpenAI ? 'OpenAI' : 'Gemini';
    const toastId = toast.loading(`${character.name}でテスト生成中（${providerLabel}）...`);

    try {
      const result = useOpenAI
        ? await generateThumbnailWithOpenAI(activeApiKey, title, character, false, openaiImageModel, openaiImageQuality)
        : await generateThumbnail(activeApiKey, title, character);

      if (result.success && result.imageBase64) {
        setTestPreviewImage(base64ToDataUrl(result.imageBase64));
        toast.success(`テスト生成完了（${providerLabel}）`, { id: toastId });
      } else {
        toast.error(result.error || '生成に失敗しました', { id: toastId });
      }
    } catch {
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
    persistSettings({ matomeln_thumbnail_characters: JSON.stringify(updatedCharacters) });
    setShowCharacterModal(false);
  };

  // キャラクターを削除
  const deleteCharacter = (id: string) => {
    const updatedCharacters = thumbnailCharacters.filter(c => c.id !== id);
    setThumbnailCharacters(updatedCharacters);
    persistSettings({ matomeln_thumbnail_characters: JSON.stringify(updatedCharacters) });
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
    persistSettings({ matomeln_thumbnail_characters: JSON.stringify(updatedCharacters) });
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
    persistSettings({ matomeln_thumbnail_characters: JSON.stringify(updatedCharacters) });
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
    setBlogForm({ name: '', blogId: '', apiUsername: '', apiKey: '', blogType: 'livedoor', disabled: false });
    setShowBlogModal(true);
  };

  // ブログ編集モーダルを開く
  const openEditBlogModal = (blog: BlogSettings) => {
    setEditingBlog(blog);
    setBlogForm({ name: blog.name, blogId: blog.blogId, apiUsername: blog.apiUsername || '', apiKey: blog.apiKey, blogType: blog.blogType || 'livedoor', disabled: blog.disabled || false });
    setShowBlogModal(true);
  };

  // ブログを保存
  const saveBlog = () => {
    if (!blogForm.name.trim() || !blogForm.blogId.trim() || !blogForm.apiKey.trim()) {
      toast.error(
        blogForm.blogType === 'kotoria'
          ? '表示名、Kotoria URL、APIキーを入力してください'
          : 'すべての項目を入力してください'
      );
      return;
    }

    if (editingBlog) {
      // 編集
      const updated = blogs.map(b =>
        b.id === editingBlog.id
          ? { ...b, name: blogForm.name, blogId: blogForm.blogId, apiUsername: blogForm.apiUsername.trim() || undefined, apiKey: blogForm.apiKey, blogType: blogForm.blogType, disabled: blogForm.disabled }
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
        apiUsername: blogForm.apiUsername.trim() || undefined,
        apiKey: blogForm.apiKey,
        blogType: blogForm.blogType,
        disabled: blogForm.disabled,
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
            <HeroButton
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </HeroButton>
          </div>

          {/* コンテンツ */}
          <div className="p-4 max-h-[calc(85vh-70px)] overflow-y-auto space-y-4">
            {/* ブログ設定 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">ブログ設定</h3>
              {blogs.length > 0 ? (
                <div className="space-y-2">
                  <HeroSelect
                    value={selectedBlogId || ''}
                    onChange={(e) => onSelectedBlogIdChange(e.target.value || null)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent cursor-pointer"
                  >
                    {blogs.map(blog => (
                      <option key={blog.id} value={blog.id} disabled={blog.disabled}>{blog.name}{blog.disabled ? '（更新中止）' : ''}</option>
                    ))}
                  </HeroSelect>
                  <div className="flex gap-2">
                    <HeroButton
                      onClick={openAddBlogModal}
                      className="flex-1 text-xs bg-green-500 text-white hover:bg-green-600 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      + 追加
                    </HeroButton>
                    <HeroButton
                      onClick={() => {
                        const blog = blogs.find(b => b.id === selectedBlogId);
                        if (blog) openEditBlogModal(blog);
                      }}
                      disabled={!selectedBlogId}
                      className="flex-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 px-2 py-2 rounded-lg font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      編集
                    </HeroButton>
                  </div>
                </div>
              ) : (
                <HeroButton
                  onClick={openAddBlogModal}
                  className="w-full text-sm bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  + ブログを追加
                </HeroButton>
              )}
              <p className="text-xs text-gray-500 mt-2">
                ライブドアブログ、ガールズまとめ、Kotoriaの投稿先を登録できます
              </p>
            </div>

            {/* レス名設定 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">レス名</h3>
                {customName && (
                  <HeroButton
                    onClick={() => onCustomNameChange('')}
                    className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    リセット
                  </HeroButton>
                )}
              </div>
              <HeroInput
                type="text"
                value={customName}
                onChange={(e) => onCustomNameChange(e.target.value)}
                placeholder="未設定"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent mb-3"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <HeroInput
                    type="checkbox"
                    checked={customNameBold}
                    onChange={(e) => onCustomNameBoldChange(e.target.checked)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">太字</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">色:</span>
                  <HeroInput
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
                <HeroInput
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
              <HeroTextArea
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
                  <HeroButton
                    onClick={() => {
                      setCustomFooterHtml('');
                      persistSettings({ matomeln_custom_footer_html: null });
                      toast.success('カスタムフッターHTMLを削除しました');
                    }}
                    className="text-sm bg-gray-400 text-white hover:bg-gray-500 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    クリア
                  </HeroButton>
                  <HeroButton
                    onClick={saveCustomFooterHtml}
                    className="text-sm bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    保存
                  </HeroButton>
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
                        <HeroInput
                          type={showClaudeApiKey ? 'text' : 'password'}
                          value={claudeApiKey}
                          onChange={(e) => setClaudeApiKey(e.target.value)}
                          placeholder="sk-ant-api03-..."
                          className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <HeroButton
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
                        </HeroButton>
                      </div>
                      <HeroButton
                        onClick={saveClaudeApiKey}
                        className="text-sm bg-purple-500 text-white hover:bg-purple-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        保存
                      </HeroButton>
                    </div>
                  </div>

                  <p className="text-xs text-purple-600">
                    レスを自動選択・色付けするAIまとめ機能に使用。ローカルOllama選択時はClaude APIキー不要です。
                  </p>

                  <div className="rounded-lg border border-purple-200 bg-white p-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">AIまとめプロバイダー</label>
                      <div className="flex gap-2">
                        {(['claude', 'ollama'] as const).map((provider) => (
                          <HeroButton
                            key={provider}
                            type="button"
                            onClick={() => {
                              setAiSummaryProvider(provider);
                              persistSettings({ matomeln_ai_summary_provider: provider });
                            }}
                            className={`flex-1 px-3 py-2 text-xs rounded-lg font-bold cursor-pointer transition-colors ${
                              aiSummaryProvider === provider
                                ? 'bg-purple-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {provider === 'claude' ? 'Claude' : 'Ollama'}
                          </HeroButton>
                        ))}
                      </div>
                    </div>

                    {aiSummaryProvider === 'ollama' && (
                      <div className="space-y-2">
                        <HeroInput
                          type="text"
                          value={ollamaEndpoint}
                          onChange={(e) => setOllamaEndpoint(e.target.value)}
                          onBlur={() => persistSettings({ matomeln_ollama_endpoint: ollamaEndpoint.trim() || 'http://127.0.0.1:11434' })}
                          placeholder="http://127.0.0.1:11434"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                        <HeroInput
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          onBlur={() => persistSettings({ matomeln_ollama_model: ollamaModel.trim() || 'gemma4:e4b' })}
                          placeholder="gemma4:e4b"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                        <label className="flex items-center gap-2 text-xs text-gray-700">
                          <HeroInput
                            type="checkbox"
                            checked={imageModerationEnabled}
                            onChange={(e) => {
                              setImageModerationEnabled(e.target.checked);
                              persistSettings({ matomeln_image_moderation_enabled: e.target.checked ? 'true' : 'false' });
                            }}
                            className="w-4 h-4"
                          />
                          画像付きレスのグロ・エロ判定を有効にする
                        </label>
                        <HeroInput
                          type="text"
                          value={imageModerationModel}
                          onChange={(e) => setImageModerationModel(e.target.value)}
                          onBlur={() => persistSettings({ matomeln_image_moderation_model: imageModerationModel.trim() || 'gemma3:4b' })}
                          placeholder="gemma3:4b"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-purple-200 bg-white p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <HeroInput
                        type="checkbox"
                        checked={aiInputMode === 'token-saving'}
                        onChange={(e) => {
                          const nextMode = e.target.checked ? 'token-saving' : 'standard';
                          setAiInputMode(nextMode);
                          persistSettings({ matomeln_ai_input_mode: nextMode });
                          toast.success(e.target.checked ? 'Token削減モードを有効にしました' : '通常入力モードに戻しました');
                        }}
                        className="mt-0.5 w-4 h-4"
                      />
                      <span>
                        <span className="block text-sm font-bold text-gray-800">Token削減モード</span>
                        <span className="block text-xs text-gray-600 mt-1">
                          AIに渡すレス一覧から短文ノイズや荒らし候補を省き、重要レスは元番号のまま保持します。投稿・HTML生成の流れは変わりません。
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* AIサムネイル設定（管理者のみ） */}
            {isAdmin && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-gray-800">AIサムネイル</h3>
                  <label className="flex items-center gap-1 ml-auto cursor-pointer">
                    <HeroInput
                      type="checkbox"
                      checked={thumbnailEnabled}
                      onChange={(e) => {
                        setThumbnailEnabled(e.target.checked);
                        persistSettings({ matomeln_thumbnail_enabled: String(e.target.checked) });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-gray-600">有効</span>
                  </label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    thumbnailProvider === 'openai'
                      ? 'bg-green-200 text-green-700'
                      : 'bg-blue-200 text-blue-700'
                  }`}>
                    {thumbnailProvider === 'openai' ? 'OpenAI' : 'Gemini'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* プロバイダー選択 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      プロバイダー
                    </label>
                    <div className="flex gap-2">
                      <HeroButton
                        type="button"
                        onClick={() => saveThumbnailProvider('gemini')}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg font-bold cursor-pointer transition-colors ${
                          thumbnailProvider === 'gemini'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Gemini
                      </HeroButton>
                      <HeroButton
                        type="button"
                        onClick={() => saveThumbnailProvider('openai')}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg font-bold cursor-pointer transition-colors ${
                          thumbnailProvider === 'openai'
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        OpenAI
                      </HeroButton>
                    </div>

                    {/* OpenAI選択時: モデル・品質設定 */}
                    {thumbnailProvider === 'openai' && (
                      <div className="mt-2 space-y-2">
                        {/* モデル選択 */}
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">モデル</label>
                          <div className="flex gap-1">
                            {([
                              { value: 'gpt-image-1' as const, label: 'GPT Image 1' },
                              { value: 'gpt-image-1-mini' as const, label: 'GPT Image 1 Mini' },
                            ]).map(({ value, label }) => (
                              <HeroButton
                                key={value}
                                type="button"
                                onClick={() => saveOpenaiImageModel(value)}
                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg font-bold cursor-pointer transition-colors ${
                                  openaiImageModel === value
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {label}
                              </HeroButton>
                            ))}
                          </div>
                        </div>

                        {/* 品質選択 */}
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">品質</label>
                          <div className="flex gap-1">
                            {([
                              { value: 'low' as const, label: 'Low' },
                              { value: 'medium' as const, label: 'Medium' },
                              { value: 'high' as const, label: 'High' },
                            ]).map(({ value, label }) => (
                              <HeroButton
                                key={value}
                                type="button"
                                onClick={() => saveOpenaiImageQuality(value)}
                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg font-bold cursor-pointer transition-colors ${
                                  openaiImageQuality === value
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {label}
                              </HeroButton>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* コスト表 */}
                    <div className="mt-2 text-[10px] text-gray-400">
                      <div className="flex justify-between border-b border-gray-200 pb-0.5 mb-0.5">
                        <span className="font-bold text-gray-500">モデル</span>
                        <span className="font-bold text-gray-500">1枚あたり</span>
                      </div>
                      <div className={`flex justify-between ${thumbnailProvider === 'gemini' ? 'text-blue-500 font-bold' : ''}`}>
                        <span>Nano Banana 2 Lite</span>
                        <span className="font-mono">$0.034（約5.5円）</span>
                      </div>
                      {thumbnailProvider === 'openai' ? (
                        <>
                          {openaiImageModel === 'gpt-image-1' ? (
                            <>
                              <div className={`flex justify-between ${openaiImageQuality === 'low' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 / Low</span>
                                <span className="font-mono">$0.011（約1.7円）</span>
                              </div>
                              <div className={`flex justify-between ${openaiImageQuality === 'medium' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 / Medium</span>
                                <span className="font-mono">$0.042（約6.3円）</span>
                              </div>
                              <div className={`flex justify-between ${openaiImageQuality === 'high' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 / High</span>
                                <span className="font-mono">$0.167（約25円）</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={`flex justify-between ${openaiImageQuality === 'low' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 Mini / Low</span>
                                <span className="font-mono">$0.005（約0.8円）</span>
                              </div>
                              <div className={`flex justify-between ${openaiImageQuality === 'medium' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 Mini / Medium</span>
                                <span className="font-mono">$0.011（約1.7円）</span>
                              </div>
                              <div className={`flex justify-between ${openaiImageQuality === 'high' ? 'text-green-600 font-bold' : ''}`}>
                                <span>GPT Image 1 Mini / High</span>
                                <span className="font-mono">$0.036（約5.4円）</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span>OpenAI GPT Image 1 Mini / Low</span>
                          <span className="font-mono">$0.005（約0.8円）</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* APIキー */}
                  <div className="border-t border-blue-200 pt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Gemini APIキー
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <HeroInput
                          type={showGeminiApiKey ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <HeroButton
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
                        </HeroButton>
                      </div>
                      <HeroButton
                        onClick={saveGeminiApiKey}
                        className="text-sm bg-blue-500 text-white hover:bg-blue-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        保存
                      </HeroButton>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      サムネイル生成 + キャラクター選択に使用
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      OpenAI APIキー
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <HeroInput
                          type={showOpenaiApiKey ? 'text' : 'password'}
                          value={openaiApiKey}
                          onChange={(e) => setOpenaiApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                        <HeroButton
                          type="button"
                          onClick={() => setShowOpenaiApiKey(!showOpenaiApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showOpenaiApiKey ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </HeroButton>
                      </div>
                      <HeroButton
                        onClick={saveOpenaiApiKey}
                        className="text-sm bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        保存
                      </HeroButton>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      サムネイル生成に使用
                    </p>
                  </div>

                  {/* 参考キャラクター */}
                  <div className="border-t border-blue-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-700">
                        参考キャラクター
                      </label>
                      <HeroButton
                        onClick={openAddCharacterModal}
                        className="text-xs bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                      >
                        + 追加
                      </HeroButton>
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
                              <HeroButton
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
                              </HeroButton>
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
                            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              thumbnailProvider === 'openai'
                                ? 'bg-green-200 text-green-700'
                                : 'bg-blue-200 text-blue-700'
                            }`}>
                              {thumbnailProvider === 'openai' ? 'OpenAI' : 'Gemini'}
                            </span>
                          </span>
                          <HeroButton
                            onClick={() => {
                              setTestPreviewCharacter(null);
                              setTestPreviewImage(null);
                            }}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </HeroButton>
                        </div>
                        <div className="space-y-2">
                          <HeroInput
                            type="text"
                            value={testTitle}
                            onChange={(e) => setTestTitle(e.target.value)}
                            placeholder="テスト用タイトルを入力..."
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                          <div className="flex gap-1 flex-wrap">
                            {sampleTitles.slice(0, 3).map((title, i) => (
                              <HeroButton
                                key={i}
                                onClick={() => setTestTitle(title)}
                                className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate max-w-[120px]"
                              >
                                {title}
                              </HeroButton>
                            ))}
                          </div>
                          <HeroButton
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
                          </HeroButton>
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
                    <HeroInput
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
                          <HeroInput
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
                          {isLifestyleBlog(blog) && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                              {LIFE_BLOG_ROUTING_BADGE}
                            </span>
                          )}
                          <HeroButton
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              testBlogConnection(blog);
                            }}
                            disabled={testingBlogId === blog.id}
                            className="ml-auto rounded border border-purple-200 bg-white px-2 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 disabled:cursor-wait disabled:opacity-60"
                          >
                            {testingBlogId === blog.id ? '確認中' : '接続テスト'}
                          </HeroButton>
                          {blogTestResults[blog.id] && (
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                              blogTestResults[blog.id].ok
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {blogTestResults[blog.id].message}
                            </span>
                          )}
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
              <HeroButton
                onClick={() => setShowBlogModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label="閉じる"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </HeroButton>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ブログタイプ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <HeroButton
                    type="button"
                    onClick={() => selectBlogType('livedoor')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-bold cursor-pointer transition-colors ${
                      blogForm.blogType === 'livedoor'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ライブドアブログ
                  </HeroButton>
                  <HeroButton
                    type="button"
                    onClick={() => selectBlogType('girls-matome')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-bold cursor-pointer transition-colors ${
                      blogForm.blogType === 'girls-matome'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ガールズまとめ
                  </HeroButton>
                  <HeroButton
                    type="button"
                    onClick={() => selectBlogType('kotoria')}
                    className={`px-3 py-2 text-sm rounded-lg font-bold cursor-pointer transition-colors ${
                      blogForm.blogType === 'kotoria'
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Kotoria
                  </HeroButton>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示名
                </label>
                <HeroInput
                  type="text"
                  value={blogForm.name}
                  onChange={(e) => setBlogForm({ ...blogForm, name: e.target.value })}
                  placeholder={blogForm.blogType === 'kotoria' ? 'Kotoriaのブログ' : blogForm.blogType === 'girls-matome' ? 'ガールズまとめ速報' : 'マイブログ'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {blogForm.blogType === 'livedoor' ? 'ブログID' : blogForm.blogType === 'kotoria' ? 'Kotoria URL' : 'API URL'}
                </label>
                <HeroInput
                  type="text"
                  value={blogForm.blogId}
                  onChange={(e) => setBlogForm({ ...blogForm, blogId: e.target.value })}
                  placeholder={blogForm.blogType === 'kotoria' ? 'https://kotoria.me' : blogForm.blogType === 'girls-matome' ? 'https://girls-matome.example.com' : 'myblog'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blogForm.blogType === 'kotoria'
                    ? '通常は https://kotoria.me のままでOKです。投稿先ブログはAPIキーから自動判定されるため、ブログIDは不要です。'
                    : blogForm.blogType === 'girls-matome'
                      ? 'ガールズまとめ速報のAPIエンドポイントURL'
                      : 'https://●●●.blog.jp の ●●● 部分'}
                </p>
              </div>
              {blogForm.blogType === 'livedoor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    認証ユーザー名
                  </label>
                  <HeroInput
                    type="text"
                    value={blogForm.apiUsername}
                    onChange={(e) => setBlogForm({ ...blogForm, apiUsername: e.target.value })}
                    placeholder="未入力ならブログIDを使用"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    複数ブログを同じライブドアアカウントで投稿する場合は、ログイン側のユーザー名を指定します。
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  APIキー
                </label>
                <HeroInput
                  type="password"
                  value={blogForm.apiKey}
                  onChange={(e) => setBlogForm({ ...blogForm, apiKey: e.target.value })}
                  placeholder="APIキー"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <HeroInput
                  type="checkbox"
                  id="blog-disabled"
                  checked={blogForm.disabled}
                  onChange={(e) => setBlogForm({ ...blogForm, disabled: e.target.checked })}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer"
                />
                <label htmlFor="blog-disabled" className="text-sm text-gray-700 cursor-pointer">
                  更新中止（選択不可にする）
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                {editingBlog && (
                  <HeroButton
                    onClick={() => deleteBlog(editingBlog.id)}
                    className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    削除
                  </HeroButton>
                )}
                <div className="flex-1" />
                <HeroButton
                  onClick={() => setShowBlogModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  キャンセル
                </HeroButton>
                <HeroButton
                  onClick={saveBlog}
                  className="px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  保存
                </HeroButton>
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
              <HeroButton
                onClick={() => setShowCharacterModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </HeroButton>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キャラクター名 <span className="text-red-500">*</span>
                </label>
                <HeroInput
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
                <HeroTextArea
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
                            <HeroInput
                              type="text"
                              value={url}
                              readOnly
                              className="w-full text-xs px-2 py-1 bg-white border border-gray-200 rounded truncate"
                            />
                          </div>
                          <HeroButton
                            onClick={() => removeImageFromCharacter(editingCharacter.id, index)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </HeroButton>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 新しい画像を追加 */}
                  <div className="flex gap-2">
                    <HeroInput
                      type="text"
                      value={characterForm.imageUrl}
                      onChange={(e) => setCharacterForm({ ...characterForm, imageUrl: e.target.value })}
                      placeholder="https://livedoor.blogimg.jp/.../image.png"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <HeroButton
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
                    </HeroButton>
                  </div>
                </div>
              )}

              {/* 新規作成時の初期画像URL */}
              {!editingCharacter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    参考画像URL（最初の1枚）
                  </label>
                  <HeroInput
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
                  <HeroButton
                    onClick={() => deleteCharacter(editingCharacter.id)}
                    className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    削除
                  </HeroButton>
                )}
                <div className="flex-1" />
                <HeroButton
                  onClick={() => setShowCharacterModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  キャンセル
                </HeroButton>
                <HeroButton
                  onClick={saveCharacter}
                  className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  保存
                </HeroButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
