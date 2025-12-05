'use client';

import { useState, useRef, useEffect } from 'react';
import { extractTalkIdFromUrl, detectSourceType } from '@/lib/shikutoku-api';
import { Talk, ThumbnailCharacter } from '@/lib/types';
import { generateThumbnail, selectCharacterForArticle } from '@/lib/ai-thumbnail';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface TalkLoaderProps {
  onLoad: (input: string) => void;
  currentTalk: Talk | null;
  commentsCount?: number;
  thumbnailUrl?: string;
  onThumbnailUrlChange?: (url: string) => void;
  apiSettings?: { blogUrl: string; apiKey: string };
  isDevMode?: boolean;
  clearInputOnLoad?: boolean;
}

export default function TalkLoader({
  onLoad,
  currentTalk,
  commentsCount,
  thumbnailUrl = '',
  onThumbnailUrlChange,
  apiSettings = { blogUrl: '', apiKey: '' },
  isDevMode = false,
  clearInputOnLoad = false
}: TalkLoaderProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [thumbnailCharacters, setThumbnailCharacters] = useState<ThumbnailCharacter[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini APIキーとキャラクターを読み込み
  useEffect(() => {
    const savedKey = localStorage.getItem('matomeln_gemini_api_key');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }
    const savedCharacters = localStorage.getItem('matomeln_thumbnail_characters');
    if (savedCharacters) {
      try {
        setThumbnailCharacters(JSON.parse(savedCharacters));
      } catch {
        setThumbnailCharacters([]);
      }
    }
  }, []);

  // スレッド読み込み成功後にURL入力欄をクリア
  useEffect(() => {
    if (currentTalk && clearInputOnLoad) {
      setInput('');
    }
  }, [currentTalk, clearInputOnLoad]);

  // サムネイル画像をアップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiSettings.blogUrl || !apiSettings.apiKey) {
      toast.error('タグ発行画面でAPI設定を行ってください');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ファイルサイズは5MB以下にしてください');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('blogId', apiSettings.blogUrl);
      formData.append('apiKey', apiSettings.apiKey);
      formData.append('file', file);

      const response = await fetch('/api/proxy/uploadImage', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像のアップロードに失敗しました');
      }

      if (data.url) {
        onThumbnailUrlChange?.(data.url);
        toast.success('サムネイルをアップロードしました');
      } else {
        toast.error('画像URLの取得に失敗しました');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '画像のアップロードに失敗しました';
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // AIサムネイル生成
  const handleGenerateAIThumbnail = async () => {
    if (!currentTalk) {
      toast.error('スレッドを読み込んでください');
      return;
    }

    if (!geminiApiKey) {
      toast.error('設定画面でGemini APIキーを設定してください');
      return;
    }

    if (!apiSettings.blogUrl || !apiSettings.apiKey) {
      toast.error('設定画面でブログ設定を行ってください');
      return;
    }

    setIsGeneratingAI(true);
    const toastId = toast.loading('AIサムネイルを生成中...');

    try {
      // AIが記事に合うキャラクターを選択
      let character: ThumbnailCharacter | undefined;
      if (thumbnailCharacters.length > 0) {
        toast.loading('キャラクターを選択中...', { id: toastId });
        character = await selectCharacterForArticle(geminiApiKey, currentTalk.title, thumbnailCharacters);
        if (character) {
          console.log('📷 選択されたキャラクター:', character.name);
        }
        toast.loading('AIサムネイルを生成中...', { id: toastId });
      }
      const result = await generateThumbnail(geminiApiKey, currentTalk.title, character);

      if (!result.success || !result.imageBase64) {
        throw new Error(result.error || '画像生成に失敗しました');
      }

      // Base64画像をBlobに変換
      const binary = atob(result.imageBase64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: 'image/png' });

      // ライブドアブログにアップロード
      toast.loading('ブログにアップロード中...', { id: toastId });

      const formData = new FormData();
      formData.append('blogId', apiSettings.blogUrl);
      formData.append('apiKey', apiSettings.apiKey);
      formData.append('file', blob, `ai-thumbnail-${Date.now()}.png`);

      const response = await fetch('/api/proxy/uploadImage', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      if (data.url) {
        onThumbnailUrlChange?.(data.url);
        toast.success('AIサムネイルを生成しました', { id: toastId });
      } else {
        throw new Error('画像URLの取得に失敗しました');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AIサムネイル生成に失敗しました';
      toast.error(message, { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError('URLを入力してください');
      return;
    }

    const sourceType = detectSourceType(trimmedInput);

    if (sourceType === 'unknown') {
      setError('有効なShikutoku、5ch、open2ch、2ch.scのURLを入力してください');
      return;
    }

    // Shikutokuの場合はIDを抽出して検証
    if (sourceType === 'shikutoku') {
      const talkId = extractTalkIdFromUrl(trimmedInput);
      if (!talkId) {
        setError('有効なShikutoku URLを入力してください');
        return;
      }
    }

    onLoad(trimmedInput);
  };

  return (
    <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-pink-400 text-white rounded-xl flex items-center justify-center shadow-md">
          <span className="font-bold text-lg">1</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">スレッドを読み込む</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm text-gray-600 mb-1">
            <a href="https://5ch.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">5ch.net</a>、<a href="https://2ch.sc" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">2ch.sc</a>、<a href="https://open2ch.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">open2ch.net</a>、<a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">shikutoku.me</a> のURL
          </label>
          <input
            type="text"
            id="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://xxx.5ch.net/... または https://xxx.2ch.sc/... または https://shikutoku.me/talks/123"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm bg-white"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-3 px-4 rounded-xl hover:from-orange-500 hover:to-pink-500 transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
          <div className="flex gap-3">
            {/* サムネイル */}
            <div className="flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex flex-col gap-1">
                {thumbnailUrl ? (
                  <div className="relative group">
                    <img
                      src={thumbnailUrl}
                      alt="サムネイル"
                      className="w-20 h-20 object-cover rounded-lg border-2 border-orange-300 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <button
                      onClick={() => onThumbnailUrlChange?.('')}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ×
                    </button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <LoadingSpinner size="md" color="white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isGeneratingAI || !apiSettings.blogUrl || !apiSettings.apiKey}
                    className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      isUploading || isGeneratingAI || !apiSettings.blogUrl || !apiSettings.apiKey
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-orange-300 bg-orange-100/50 text-orange-500 hover:bg-orange-100'
                    }`}
                    title={!apiSettings.blogUrl || !apiSettings.apiKey ? '設定画面でブログ設定後に使用可能' : 'サムネイルをアップロード'}
                  >
                    {isUploading ? (
                      <LoadingSpinner size="md" color="orange" />
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] mt-1">サムネ</span>
                      </>
                    )}
                  </button>
                )}
                {/* AIサムネイル生成ボタン（開発者モード時のみ） */}
                {isDevMode && geminiApiKey && (
                  <button
                    onClick={handleGenerateAIThumbnail}
                    disabled={isGeneratingAI || isUploading || !apiSettings.blogUrl || !apiSettings.apiKey}
                    className={`w-20 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      isGeneratingAI || isUploading || !apiSettings.blogUrl || !apiSettings.apiKey
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                    }`}
                    title="AIでサムネイルを自動生成"
                  >
                    {isGeneratingAI ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                    AI生成
                  </button>
                )}
              </div>
            </div>
            {/* タイトルとコメント数 */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-orange-600">{currentTalk.title}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                {commentsCount !== undefined ? commentsCount : 0}件のコメント
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
