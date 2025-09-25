'use client';

import { useState, useRef } from 'react';
import { Talk, Comment, MatomeOptions } from '@/lib/types';
import { generateMatomeHTML } from '@/lib/html-templates';
import toast from 'react-hot-toast';

interface HTMLGeneratorProps {
  talk: Talk | null;
  selectedComments: Comment[];
}

export default function HTMLGenerator({ talk, selectedComments }: HTMLGeneratorProps) {
  const [options, setOptions] = useState<MatomeOptions>({
    includeImages: false,
    style: 'simple',
    includeTimestamp: false,
    includeName: true,
  });
  const [generatedHTML, setGeneratedHTML] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = () => {
    if (!talk || selectedComments.length === 0) {
      toast.error('トークとコメントを選択してください');
      return;
    }

    const html = generateMatomeHTML(talk, selectedComments, options);
    setGeneratedHTML(html);
    setShowPreview(false);
    toast.success('HTMLを生成しました');
  };

  const handleCopy = async () => {
    if (!generatedHTML) return;

    try {
      await navigator.clipboard.writeText(generatedHTML);
      toast.success('コピーしました！');
    } catch (err) {
      // フォールバック
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        toast.success('コピーしました！');
      }
    }
  };

  const handleClear = () => {
    setGeneratedHTML('');
    setShowPreview(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        ステップ3: HTMLを生成
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            スタイル
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="simple"
                checked={options.style === 'simple'}
                onChange={(e) => setOptions({ ...options, style: 'simple' })}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500"
              />
              <span className="ml-2 text-sm text-gray-700">シンプル</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="rich"
                checked={options.style === 'rich'}
                onChange={(e) => setOptions({ ...options, style: 'rich' })}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500"
              />
              <span className="ml-2 text-sm text-gray-700">リッチ（CSS付き）</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.includeImages}
              onChange={(e) => setOptions({ ...options, includeImages: e.target.checked })}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">画像を含める</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.includeTimestamp}
              onChange={(e) => setOptions({ ...options, includeTimestamp: e.target.checked })}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">投稿時刻を表示</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.includeName}
              onChange={(e) => setOptions({ ...options, includeName: e.target.checked })}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">名前を表示</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerate}
          disabled={!talk || selectedComments.length === 0}
          className="flex-1 bg-pink-500 text-white font-medium py-2 px-4 rounded-xl hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          HTMLを生成
        </button>
        {generatedHTML && (
          <>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {showPreview ? 'HTML表示' : 'プレビュー'}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              クリア
            </button>
          </>
        )}
      </div>

      {generatedHTML && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              生成されたHTML（{Math.ceil(generatedHTML.length / 1024)}KB）
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              コピー
            </button>
          </div>

          {showPreview ? (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: generatedHTML }} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={generatedHTML}
              readOnly
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          )}
        </div>
      )}

      {!generatedHTML && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          コメントを選択してHTMLを生成してください
        </div>
      )}
    </div>
  );
}