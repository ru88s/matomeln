'use client';

import { useState, useCallback, useRef } from 'react';
import { fetchUnsummarizedUrls, markThreadAsSummarized, BulkProcessStatus, getInitialBulkStatus } from '@/lib/bulk-processing';
import toast from 'react-hot-toast';

interface BulkProcessPanelProps {
  onBulkProcess: (url: string) => Promise<void>;
  isProcessingAI: boolean;
}

export default function BulkProcessPanel({
  onBulkProcess,
  isProcessingAI,
}: BulkProcessPanelProps) {
  const [urls, setUrls] = useState<string>('');
  const [status, setStatus] = useState<BulkProcessStatus>(getInitialBulkStatus());
  const [isFetching, setIsFetching] = useState(false);
  // useRefで停止フラグを管理（クロージャ問題を回避）
  const shouldStopRef = useRef(false);

  // 未まとめURL取得
  const handleFetchUrls = useCallback(async () => {
    setIsFetching(true);
    const toastId = toast.loading('未まとめURLを取得中...');

    try {
      const result = await fetchUnsummarizedUrls({ limit: 100 });
      setUrls(result.urls.join('\n'));
      toast.success(`${result.count}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'URL取得に失敗しました', { id: toastId });
    } finally {
      setIsFetching(false);
    }
  }, []);

  // 一括処理開始
  const handleStartBulk = useCallback(async () => {
    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && !u.startsWith('#')); // コメント行は除外

    if (urlList.length === 0) {
      toast.error('URLを入力してください');
      return;
    }

    shouldStopRef.current = false;

    const initialStatus: BulkProcessStatus = {
      isProcessing: true,
      currentIndex: 0,
      totalCount: urlList.length,
      currentUrl: urlList[0],
      completedUrls: [],
      failedUrls: [],
      startTime: Date.now(),
    };
    setStatus(initialStatus);

    let completedCount = 0;
    let failedCount = 0;
    const failedUrlsList: { url: string; error: string }[] = [];

    for (let i = 0; i < urlList.length; i++) {
      // 停止チェック（refを使うことでリアルタイムの値を取得）
      if (shouldStopRef.current) {
        toast('処理を停止しました', { icon: '⏹️' });
        break;
      }

      const url = urlList[i];
      setStatus(prev => ({
        ...prev,
        currentIndex: i,
        currentUrl: url,
      }));

      try {
        // スレッドを読み込んでAIまとめを実行
        toast.loading(`(${i + 1}/${urlList.length}) 処理中...`, { id: 'bulk-progress' });
        await onBulkProcess(url);

        // 停止チェック
        if (shouldStopRef.current) {
          toast('処理を停止しました', { icon: '⏹️' });
          break;
        }

        // まとめ済みとして登録
        try {
          await markThreadAsSummarized(url);
        } catch (markError) {
          console.warn('まとめ済み登録に失敗:', markError);
        }

        completedCount++;
        setStatus(prev => ({
          ...prev,
          completedUrls: [...prev.completedUrls, url],
        }));

        toast.success(`(${i + 1}/${urlList.length}) 完了`, { id: 'bulk-progress' });

        // 次のURL処理前に待機
        if (i < urlList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error('Bulk process error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        failedCount++;
        failedUrlsList.push({ url, error: errorMsg });
        setStatus(prev => ({
          ...prev,
          failedUrls: [...prev.failedUrls, { url, error: errorMsg }],
        }));
        toast.error(`(${i + 1}/${urlList.length}) エラー: ${errorMsg}`, { id: 'bulk-progress' });

        // エラーでも次に進む
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 完了
    setStatus(prev => ({
      ...prev,
      isProcessing: false,
      currentUrl: null,
    }));

    toast.success(`一括処理完了: ${completedCount}件成功, ${failedCount}件失敗`, { id: 'bulk-progress' });
  }, [urls, onBulkProcess]);

  // 停止
  const handleStop = useCallback(() => {
    shouldStopRef.current = true;
    toast('停止処理中...', { icon: '⏳' });
  }, []);

  const isProcessing = status.isProcessing || isProcessingAI;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        一括AIまとめ
      </h3>

      {/* URL入力エリア */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL一覧（1行に1URL、#でコメント）
        </label>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://hayabusa9.5ch.net/test/read.cgi/news/1234567890/&#10;# コメント行は無視されます&#10;https://..."
          disabled={isProcessing}
        />
      </div>

      {/* ボタン群 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleFetchUrls}
          disabled={isProcessing || isFetching}
          className="flex-1 bg-white border border-indigo-300 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isFetching ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              取得中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              未まとめURL取得
            </>
          )}
        </button>

        {!status.isProcessing ? (
          <button
            onClick={handleStartBulk}
            disabled={isProcessing || !urls.trim()}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-2 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            一括処理開始
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            停止
          </button>
        )}
      </div>

      {/* 進捗表示 */}
      {status.isProcessing && (
        <div className="bg-white rounded-lg p-4 border border-indigo-200">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>進捗: {status.currentIndex + 1} / {status.totalCount}</span>
            <span className="text-green-600">{status.completedUrls.length}件完了</span>
            {status.failedUrls.length > 0 && (
              <span className="text-red-600">{status.failedUrls.length}件失敗</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((status.currentIndex + 1) / status.totalCount) * 100}%` }}
            />
          </div>
          {status.currentUrl && (
            <p className="text-xs text-gray-500 truncate">
              処理中: {status.currentUrl}
            </p>
          )}
        </div>
      )}

      {/* 結果サマリー（処理完了後） */}
      {!status.isProcessing && (status.completedUrls.length > 0 || status.failedUrls.length > 0) && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-bold text-gray-700 mb-2">処理結果</h4>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">成功: {status.completedUrls.length}件</span>
            <span className="text-red-600">失敗: {status.failedUrls.length}件</span>
          </div>
          {status.failedUrls.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-red-600 cursor-pointer">失敗したURL</summary>
              <ul className="mt-1 text-xs text-gray-600 space-y-1">
                {status.failedUrls.map((f, i) => (
                  <li key={i} className="truncate">
                    {f.url}: {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
