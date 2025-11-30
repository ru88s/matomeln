'use client';

import { useState, useEffect } from 'react';
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
}

export default function HTMLGenerator({ talk, selectedComments, sourceInfo, onClose, customName = '' }: HTMLGeneratorProps) {
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
  const [apiSettings, setApiSettings] = useState({
    blogUrl: '',
    apiKey: '',
  });
  const [isPosting, setIsPosting] = useState(false);

  // ローカルストレージからAPI設定を読み込む & 自動生成
  useEffect(() => {
    const savedSettings = localStorage.getItem('livedoorBlogApiSettings');
    if (savedSettings) {
      setApiSettings(JSON.parse(savedSettings));
    }

    // モーダルが開いたら自動でHTML生成
    if (talk && selectedComments.length > 0) {
      // 並べ替えた順番をそのまま使用（ソートしない）
      generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName).then(html => {
        setGeneratedHTML(html);
      });
    }
  }, [talk, selectedComments, options, sourceInfo, customName]);

  // API設定を保存
  const saveApiSettings = () => {
    localStorage.setItem('livedoorBlogApiSettings', JSON.stringify(apiSettings));
    toast.success('API設定を保存しました');
  };

  const handleGenerate = async () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    // 並べ替えた順番をそのまま使用（ソートしない）
    const html = await generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName);
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