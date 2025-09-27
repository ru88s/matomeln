'use client';

import { useState, useEffect } from 'react';
import { Talk, CommentWithStyle, MatomeOptions } from '@/lib/types';
import { generateMatomeHTML, GeneratedHTML } from '@/lib/html-templates';
import toast from 'react-hot-toast';

// アンカーを抽出する関数
function extractAnchor(body: string): number | null {
  const match = body.match(/>>(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

// コメントをアンカーに基づいて並び替える関数
function arrangeCommentsByAnchor(comments: CommentWithStyle[]): CommentWithStyle[] {
  const result: CommentWithStyle[] = [];
  const processed = new Set<string>();

  // res_idでソートされたコメントマップを作成
  const commentMap = new Map<number, CommentWithStyle[]>();

  // 各コメントを親res_idでグループ化
  comments.forEach(comment => {
    const anchorId = extractAnchor(comment.body);
    if (anchorId !== null) {
      // アンカーがある場合、該当番号の下に配置
      if (!commentMap.has(anchorId)) {
        commentMap.set(anchorId, []);
      }
      commentMap.get(anchorId)!.push(comment);
    }
  });

  // 元のコメントを順番に処理
  comments.forEach(comment => {
    if (processed.has(comment.id)) return;

    // アンカーがないコメント、または親が存在しないアンカーを持つコメントを追加
    const anchorId = extractAnchor(comment.body);
    if (anchorId === null || !comments.some(c => Number(c.res_id) === anchorId)) {
      result.push(comment);
      processed.add(comment.id);

      // このコメントへの返信（アンカー）があれば追加
      const replies = commentMap.get(Number(comment.res_id));
      if (replies) {
        replies.forEach(reply => {
          if (!processed.has(reply.id)) {
            result.push(reply);
            processed.add(reply.id);
          }
        });
      }
    }
  });

  return result;
}

interface HTMLGeneratorProps {
  talk: Talk | null;
  selectedComments: CommentWithStyle[];
  onClose?: () => void;
}

export default function HTMLGenerator({ talk, selectedComments, onClose }: HTMLGeneratorProps) {
  const [options, setOptions] = useState<MatomeOptions>({
    includeImages: true,
    style: 'simple',
    includeTimestamp: false,
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
      // まずres_idでソートして番号順にする
      const sortedComments = [...selectedComments].sort((a, b) => Number(a.res_id) - Number(b.res_id));
      // コメントをアンカーに基づいて並び替え
      const arrangedComments = arrangeCommentsByAnchor(sortedComments);
      const html = generateMatomeHTML(talk, arrangedComments, options);
      setGeneratedHTML(html);
    }
  }, [talk, selectedComments, options]);

  // API設定を保存
  const saveApiSettings = () => {
    localStorage.setItem('livedoorBlogApiSettings', JSON.stringify(apiSettings));
    toast.success('API設定を保存しました');
  };

  const handleGenerate = () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    // まずres_idでソートして番号順にする
    const sortedComments = [...selectedComments].sort((a, b) => Number(a.res_id) - Number(b.res_id));
    // コメントをアンカーに基づいて並び替え
    const arrangedComments = arrangeCommentsByAnchor(sortedComments);
    const html = generateMatomeHTML(talk, arrangedComments, options);
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
        const missingInfo = data.missing ?
          '\n不足: ' + Object.entries(data.missing)
            .filter(([_, missing]) => missing)
            .map(([key]) => key)
            .join(', ')
          : '';
        toast.error(errorMessage + missingInfo);
        console.error('Blog post error:', {
          status: response.status,
          data: data,
          url: '/api/proxy/postBlog'
        });
        return;
      }

      toast.success('ブログに投稿しました！');
    } catch (error) {
      console.error('Error posting to blog:', error);
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
                className="text-sm px-3 py-1 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
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
                className="text-sm px-3 py-1 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
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
                className="text-sm px-3 py-1 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
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
                    placeholder="yourblog"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className={`w-full py-3 rounded-2xl font-bold shadow-md transition-all ${
                apiSettings.blogUrl && apiSettings.apiKey && !isPosting
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p>HTMLタグを生成中...</p>
        </div>
      )}
    </div>
  );
}