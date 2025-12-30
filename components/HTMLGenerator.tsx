'use client';

import { useState, useEffect } from 'react';
import { Talk, CommentWithStyle, MatomeOptions, BlogSettings } from '@/lib/types';
import { generateMatomeHTML, GeneratedHTML } from '@/lib/html-templates';
import { markThreadAsSummarized } from '@/lib/bulk-processing';
import toast from 'react-hot-toast';

// 注: アンカーベースの並び替えは削除しました。
// ユーザーが手動で並べ替えた順番をそのまま使用します。

interface SourceInfo {
  source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc' | 'girlschannel';
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
  blogs?: BlogSettings[];
  selectedBlogId?: string;
}

export default function HTMLGenerator({ talk, selectedComments, sourceInfo, onClose, customName = '', customNameBold = true, customNameColor = '#ff69b4', thumbnailUrl = '', apiSettings = { blogUrl: '', apiKey: '' }, selectedBlogName = '', showIdInHtml = true, isDevMode = false, blogs = [], selectedBlogId = '' }: HTMLGeneratorProps) {
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
  // 他のブログにも投稿するかどうか（DEVモード専用）
  const [postToOtherBlogs, setPostToOtherBlogs] = useState(false);
  // 投稿先として選択されたブログID
  const [selectedOtherBlogIds, setSelectedOtherBlogIds] = useState<string[]>([]);
  // カスタムフッターHTML
  const [customFooterHtml, setCustomFooterHtml] = useState('');

  // LocalStorageから設定を読み込み
  useEffect(() => {
    if (isDevMode) {
      const saved = localStorage.getItem('matomeln_other_blogs_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          setPostToOtherBlogs(settings.postToOtherBlogs || false);
          setSelectedOtherBlogIds(settings.selectedOtherBlogIds || []);
        } catch {
          // パースエラーは無視
        }
      }
    }
    // カスタムフッターHTMLを読み込み
    const savedFooter = localStorage.getItem('matomeln_custom_footer_html');
    if (savedFooter) {
      setCustomFooterHtml(savedFooter);
    }
  }, [isDevMode]);

  // 設定変更時にLocalStorageに保存
  useEffect(() => {
    if (isDevMode) {
      localStorage.setItem('matomeln_other_blogs_settings', JSON.stringify({
        postToOtherBlogs,
        selectedOtherBlogIds,
      }));
    }
  }, [isDevMode, postToOtherBlogs, selectedOtherBlogIds]);

  // モーダルが開いたら自動でHTML生成
  useEffect(() => {
    if (talk && selectedComments.length > 0) {
      // デバッグ: 渡されたコメントを確認
      console.log('📝 HTMLGenerator: selectedComments順序:', selectedComments.map(c => `${c.res_id}`).join(', '));
      // 並べ替えた順番をそのまま使用（ソートしない）
      generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode, false, customFooterHtml).then(html => {
        setGeneratedHTML(html);
      });
    }
  }, [talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode, customFooterHtml]);

  const handleGenerate = async () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    // 並べ替えた順番をそのまま使用（ソートしない）
    const html = await generateMatomeHTML(talk, selectedComments, options, sourceInfo, customName, customNameBold, customNameColor, thumbnailUrl, showIdInHtml, isDevMode, false, customFooterHtml);
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

      // メインブログに投稿
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

      // 他のブログにも投稿（DEVモード & チェックが入っている場合）
      let otherBlogResults: { name: string; success: boolean }[] = [];
      if (isDevMode && postToOtherBlogs && selectedOtherBlogIds.length > 0) {
        const otherBlogs = blogs.filter(b => selectedOtherBlogIds.includes(b.id));

        for (const blog of otherBlogs) {
          try {
            const otherResponse = await fetch('/api/proxy/postBlog', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blogId: blog.blogId,
                apiKey: blog.apiKey,
                title: generatedHTML.title,
                body: fullBody,
                draft: false,
              }),
            });

            if (otherResponse.ok) {
              otherBlogResults.push({ name: blog.name, success: true });
            } else {
              otherBlogResults.push({ name: blog.name, success: false });
            }
          } catch {
            otherBlogResults.push({ name: blog.name, success: false });
          }
        }
      }

      // 結果を表示
      const successCount = otherBlogResults.filter(r => r.success).length;
      const failCount = otherBlogResults.filter(r => !r.success).length;

      if (otherBlogResults.length > 0) {
        if (failCount === 0) {
          toast.success(`ブログに投稿しました！（他${successCount}件も成功）`);
        } else {
          toast.success(`ブログに投稿しました！（他${successCount}件成功、${failCount}件失敗）`);
        }
      } else {
        toast.success('ブログに投稿しました！');
      }

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

      // 投稿成功後、少し待ってからモーダルを閉じる
      setTimeout(() => {
        onClose?.();
      }, 1500);
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
            ) : (
              /* 投稿先ブログを表示 */
              <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs font-bold text-orange-700 mb-2">投稿先:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    {selectedBlogName || apiSettings.blogUrl}
                  </div>
                  {isDevMode && postToOtherBlogs && selectedOtherBlogIds.length > 0 && (
                    <>
                      {blogs
                        .filter(b => selectedOtherBlogIds.includes(b.id))
                        .map(blog => (
                          <div key={blog.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                            {blog.name}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </div>
            )}

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