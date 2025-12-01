'use client';

import { useState, useEffect, useRef } from 'react';
import { Talk, CommentWithStyle, MatomeOptions } from '@/lib/types';
import { generateMatomeHTML, GeneratedHTML } from '@/lib/html-templates';
import toast from 'react-hot-toast';

// 注: アンカーベースの並び替えは削除しました。
// ユーザーが手動で並べ替えた順番をそのまま使用します。

interface SourceInfo {
  source: 'shikutoku' | '5ch';
  originalUrl: string;
}

interface HTMLGeneratorProps {
  talk: Talk | null;
  selectedComments: CommentWithStyle[];
  sourceInfo: SourceInfo | null;
  onClose?: () => void;
  customName?: string;
  customNameBold?: boolean;
  customNameColor?: string;
}

export default function HTMLGenerator({ talk, selectedComments, sourceInfo, onClose, customName = '', customNameBold = true, customNameColor = '#ff69b4' }: HTMLGeneratorProps) {
  const [options, setOptions] = useState<MatomeOptions>({
    includeImages: true,
    style: 'simple',
    includeTimestamp: true,
    includeName: false,
    commentStyle: {
      bold: true,
      fontSize: 'large',
      color: '#000000',
    },
  });
  const [generatedHTML, setGeneratedHTML] = useState<GeneratedHTML | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [apiSettings, setApiSettings] = useState({
    blogUrl: '',
    apiKey: '',
  });
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ローカルストレージからAPI設定とサムネイルを読み込む & 自動生成
  useEffect(() => {
    const savedSettings = localStorage.getItem('livedoorBlogApiSettings');
    if (savedSettings) {
      setApiSettings(JSON.parse(savedSettings));
    }
    const savedThumbnail = localStorage.getItem('matomeThumbnailUrl');
    if (savedThumbnail) {
      setThumbnailUrl(savedThumbnail);
    }

    // モーダルが開いたら自動でHTML生成
    if (talk && selectedComments.length > 0) {
      // 並べ替えた順番をそのまま使用（ソートしない）
      generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor).then(html => {
        setGeneratedHTML(html);
      });
    }
  }, [talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor]);

  // API設定を保存
  const saveApiSettings = () => {
    localStorage.setItem('livedoorBlogApiSettings', JSON.stringify(apiSettings));
    toast.success('API設定を保存しました');
  };

  // サムネイルURL変更時に保存
  const handleThumbnailChange = (url: string) => {
    setThumbnailUrl(url);
    localStorage.setItem('matomeThumbnailUrl', url);
  };

  // サムネイル画像をアップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // API設定の確認
    if (!apiSettings.blogUrl || !apiSettings.apiKey) {
      toast.error('先にライブドアブログAPI設定を入力してください');
      return;
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ファイルサイズは5MB以下にしてください');
      return;
    }

    // 画像形式チェック
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
        handleThumbnailChange(data.url);
        toast.success('画像をアップロードしました');
      } else {
        toast.error('画像URLの取得に失敗しました');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '画像のアップロードに失敗しました';
      toast.error(message);
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    // 並べ替えた順番をそのまま使用（ソートしない）
    const html = await generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor);
    setGeneratedHTML(html);
    toast.success('HTMLタグを生成しました');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('コピーしました！');
    } catch (err) {
      toast.error('コピーに失敗しました');
    }
  };

  const handleBlogPost = async () => {
    if (!generatedHTML || !apiSettings.blogUrl || !apiSettings.apiKey) {
      toast.error('API設定を入力してください');
      return;
    }

    setIsPosting(true);

    try {
      // 本文と続きを読むを組み合わせてブログ記事の内容を作成
      const fullBody = generatedHTML.footer
        ? `${generatedHTML.body}\n<!--more-->\n${generatedHTML.footer}`
        : generatedHTML.body;


      const response = await fetch('/api/proxy/postBlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogId: apiSettings.blogUrl,
          apiKey: apiSettings.apiKey,
          title: generatedHTML.title,
          body: fullBody,
          draft: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'ブログ投稿に失敗しました';
        toast.error(errorMessage);
        return;
      }

      toast.success('ブログに投稿しました！');
    } catch (error) {
      toast.error('ブログ投稿中にエラーが発生しました');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div>
      {generatedHTML ? (
        <div className="space-y-4">
          {/* サムネイル */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-900">サムネイル:</h4>
              {thumbnailUrl && (
                <button
                  onClick={() => handleThumbnailChange('')}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => handleThumbnailChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="thumbnail-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !apiSettings.blogUrl || !apiSettings.apiKey}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isUploading || !apiSettings.blogUrl || !apiSettings.apiKey
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title={!apiSettings.blogUrl || !apiSettings.apiKey ? 'API設定が必要です' : 'ライブドアブログに画像をアップロード'}
              >
                {isUploading ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    UP中
                  </span>
                ) : (
                  'UP'
                )}
              </button>
            </div>
            {!apiSettings.blogUrl || !apiSettings.apiKey ? (
              <p className="text-xs text-gray-500 mt-1">
                ※ 画像UPするにはライブドアブログAPI設定が必要です
              </p>
            ) : null}
            {thumbnailUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={thumbnailUrl}
                  alt="サムネイルプレビュー"
                  className="w-20 h-20 object-cover rounded border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">アップロード済みURL:</p>
                  <input
                    type="text"
                    value={thumbnailUrl}
                    readOnly
                    className="w-full px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded cursor-text"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>
            )}
          </div>

          {/* タイトル */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-900">タイトル:</h4>
              <button
                onClick={() => handleCopy(generatedHTML.title)}
                className="text-sm px-3 py-1 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition-colors"
              >
                コピー
              </button>
            </div>
            <textarea
              value={generatedHTML.title}
              onChange={(e) => setGeneratedHTML({...generatedHTML, title: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm bg-white h-12"
            />
          </div>

          {/* 本文 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-900">本文の内容: <span className="text-sm font-normal text-gray-600">（1つめのコメント）</span></h4>
              <button
                onClick={() => handleCopy(generatedHTML.body)}
                className="text-sm px-3 py-1 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition-colors"
              >
                コピー
              </button>
            </div>
            <textarea
              value={generatedHTML.body}
              onChange={(e) => setGeneratedHTML({...generatedHTML, body: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm bg-white h-[200px]"
            />
          </div>

          {/* 続きを読む */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-900">「続きを読む」の内容: <span className="text-sm font-normal text-gray-600">（2つめ以降のコメント）</span></h4>
              <button
                onClick={() => handleCopy(generatedHTML.footer)}
                className="text-sm px-3 py-1 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition-colors"
              >
                コピー
              </button>
            </div>
            <textarea
              value={generatedHTML.footer}
              onChange={(e) => setGeneratedHTML({...generatedHTML, footer: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm bg-white h-[200px]"
            />
          </div>

          {/* ブログ投稿 */}
          <div className="border-t pt-4">
            <details className="mb-4" open={false}>
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                ライブドアブログAPI設定
              </summary>
              <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ブログID
                  </label>
                  <input
                    type="text"
                    value={apiSettings.blogUrl}
                    onChange={(e) => setApiSettings({...apiSettings, blogUrl: e.target.value})}
                    placeholder="例: myblog (https://myblog.blog.jp のmyblog部分)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ※ブログURLの https://●●●.blog.jp の●●●部分を入力
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    APIキー
                  </label>
                  <input
                    type="password"
                    value={apiSettings.apiKey}
                    onChange={(e) => setApiSettings({...apiSettings, apiKey: e.target.value})}
                    placeholder="APIキーを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    ※ ライブドアブログの管理画面からAPIキーを取得してください
                  </p>
                  <button
                    onClick={saveApiSettings}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    設定を保存
                  </button>
                </div>
              </div>
            </details>
            <button
              onClick={handleBlogPost}
              disabled={!apiSettings.blogUrl || !apiSettings.apiKey || isPosting}
              className={`w-full py-3 rounded-lg font-bold transition-all cursor-pointer ${
                apiSettings.blogUrl && apiSettings.apiKey && !isPosting
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPosting
                ? '投稿中...'
                : apiSettings.blogUrl && apiSettings.apiKey
                  ? 'ブログに投稿'
                  : 'ブログに投稿（API設定が必要）'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p>HTMLタグを生成中...</p>
        </div>
      )}
    </div>
  );
}