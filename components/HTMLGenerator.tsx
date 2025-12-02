'use client';

import { useState, useEffect } from 'react';
import { Talk, CommentWithStyle, MatomeOptions } from '@/lib/types';
import { generateMatomeHTML, GeneratedHTML } from '@/lib/html-templates';
import { markThreadAsSummarized } from '@/lib/bulk-processing';
import toast from 'react-hot-toast';

// 注: アンカーベースの並び替えは削除しました。
// ユーザーが手動で並べ替えた順番をそのまま使用します。

interface SourceInfo {
  source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc';
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
  thumbnailUrl?: string;
  apiSettings?: { blogUrl: string; apiKey: string };
  selectedBlogName?: string;
  showIdInHtml?: boolean;
  isDevMode?: boolean;
}

export default function HTMLGenerator({ talk, selectedComments, sourceInfo, onClose, customName = '', customNameBold = true, customNameColor = '#ff69b4', thumbnailUrl = '', apiSettings = { blogUrl: '', apiKey: '' }, selectedBlogName = '', showIdInHtml = true, isDevMode = false }: HTMLGeneratorProps) {
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
  const [isPosting, setIsPosting] = useState(false);

  // モーダルが開いたら自動でHTML生成
  useEffect(() => {
    if (talk && selectedComments.length > 0) {
      // 並べ替えた順番をそのまま使用（ソートしない）
      generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode).then(html => {
        setGeneratedHTML(html);
      });
    }
  }, [talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode]);

  const handleGenerate = async () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    // 並べ替えた順番をそのまま使用（ソートしない）
    const html = await generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode);
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

      // スレメモくんにまとめ済み登録
      if (sourceInfo?.originalUrl) {
        try {
          await markThreadAsSummarized(sourceInfo.originalUrl);
          console.log('スレメモくんに登録完了');
        } catch (memoError) {
          console.warn('スレメモくん登録失敗:', memoError);
          // 登録失敗でもエラーにはしない（ブログ投稿は成功しているため）
        }
      }
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
          {/* サムネイル（設定済みの場合のみ表示） */}
          {thumbnailUrl && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <img
                src={thumbnailUrl}
                alt="サムネイル"
                className="w-16 h-16 object-cover rounded border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700 mb-1">サムネイル設定済み</p>
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
              <h4 className="font-bold text-gray-900">本文の内容: <span className="text-sm font-normal text-gray-600">（本文に設定したレス）</span></h4>
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
              <h4 className="font-bold text-gray-900">「続きを読む」の内容: <span className="text-sm font-normal text-gray-600">（本文以外のレス）</span></h4>
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
            {!apiSettings.blogUrl || !apiSettings.apiKey ? (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  サイドバーの「ブログ設定」からブログを追加してください
                </p>
              </div>
            ) : null}
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
                  : 'ブログに投稿（ブログ設定が必要）'}
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