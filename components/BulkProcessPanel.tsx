'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchUnsummarizedUrls, BulkProcessStatus, getInitialBulkStatus, markThreadAsSkipped } from '@/lib/bulk-processing';
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

  // 定期実行機能
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [autoRunInterval, setAutoRunInterval] = useState(30); // 分
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const autoRunTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoRunningRef = useRef(false);
  const consecutiveErrorsRef = useRef(0); // 連続エラー回数（投稿エラーなど致命的なもののみ）
  const MAX_CONSECUTIVE_ERRORS = 20; // 連続エラー上限（スキップ可能なエラーはカウントしない）

  // 未まとめURL取得
  const handleFetchUrls = useCallback(async () => {
    setIsFetching(true);
    const toastId = toast.loading('未まとめURLを取得中...');

    try {
      const result = await fetchUnsummarizedUrls({ limit: 1000 });
      setUrls(result.urls.join('\n'));
      toast.success(`${result.count}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'URL取得に失敗しました', { id: toastId });
    } finally {
      setIsFetching(false);
    }
  }, []);

  // スキップ可能なエラーかどうか判定（リトライ→スキップ対象）
  const isSkippableError = (errorMsg: string): boolean => {
    const skippablePatterns = [
      // AIエラー
      'AIの応答を解析できませんでした',
      'AI processing failed',
      'Failed to parse AI response',
      'overloaded',
      'rate_limit',
      'timeout',
      // 5ch取得エラー
      'スレッドが見つかりませんでした',
      '5chスレッドの取得に失敗しました',
      'スレッドタイトルの取得に失敗しました',
      'スレッドデータの解析に失敗しました',
      'DATファイルが見つかりませんでした',
      'アクセスが制限されている',
      // HTTPエラー（404など）
      '404',
      'Not Found',
      'Failed to fetch',
      '403',
      'Forbidden',
      '500',
      '502',
      '503',
      // ガールズちゃんねるエラー
      'トピックの取得に失敗',
      'Invalid GirlsChannel',
      'girlschannel',
      // コンテンツ検証エラー
      'タイトルが空のため投稿できません',
      '本文が空のため投稿できません',
    ];
    return skippablePatterns.some(pattern => errorMsg.toLowerCase().includes(pattern.toLowerCase()));
  };

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

      let success = false;
      let lastError = '';
      const maxRetries = 2; // 最大2回試行（初回 + リトライ1回）

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // スレッドを読み込んでAIまとめを実行
          const attemptMsg = attempt > 1 ? ` (リトライ ${attempt - 1}回目)` : '';
          toast.loading(`(${i + 1}/${urlList.length}) 処理中...${attemptMsg}`, { id: 'bulk-progress' });
          await onBulkProcess(url);

          // 停止チェック
          if (shouldStopRef.current) {
            toast('処理を停止しました', { icon: '⏹️' });
            break;
          }

          // スレメモくんへのまとめ済み登録はonBulkProcess内で行う
          success = true;
          break;
        } catch (error) {
          console.error(`Bulk process error (attempt ${attempt}):`, error);
          lastError = error instanceof Error ? error.message : 'Unknown error';

          // スキップ可能なエラーの場合はリトライ
          if (isSkippableError(lastError) && attempt < maxRetries) {
            toast(`(${i + 1}/${urlList.length}) エラー発生、リトライします...`, { icon: '🔄', id: 'bulk-progress' });
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機してからリトライ
            continue;
          }

          // スキップ不可のエラー（投稿エラーなど）の場合は即座に中断
          if (!isSkippableError(lastError)) {
            failedCount++;
            failedUrlsList.push({ url, error: lastError });
            setStatus(prev => ({
              ...prev,
              failedUrls: [...prev.failedUrls, { url, error: lastError }],
            }));
            toast.error(`(${i + 1}/${urlList.length}) エラー: ${lastError}`, { id: 'bulk-progress' });
            toast.error('投稿エラーが発生したため処理を中断しました', { duration: 5000 });
            shouldStopRef.current = true;
            break;
          }
        }
      }

      // 停止チェック
      if (shouldStopRef.current) {
        break;
      }

      if (success) {
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
      } else if (!shouldStopRef.current) {
        // リトライ後も失敗した場合（スキップして次へ進む）
        failedCount++;
        failedUrlsList.push({ url, error: lastError });
        setStatus(prev => ({
          ...prev,
          failedUrls: [...prev.failedUrls, { url, error: lastError }],
        }));
        toast.error(`(${i + 1}/${urlList.length}) 取得失敗: ${lastError}（スキップ）`, { id: 'bulk-progress' });

        // スレメモくんにスキップ済みとしてマーク（次回取得リストから除外）
        try {
          await markThreadAsSkipped(url, lastError);
        } catch (skipError) {
          console.error('Failed to mark as skipped:', skipError);
        }

        // スキップして次のURLに進む
        if (i < urlList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
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

  // 定期実行: 1サイクル実行（処理完了後に再度URL取得して続行）
  const runAutoProcessCycle = useCallback(async (): Promise<boolean> => {
    // 戻り値: true = 未まとめURLがまだある, false = 未まとめURLがない
    if (isAutoRunningRef.current) return false;
    isAutoRunningRef.current = true;

    try {
      // 1. 未まとめURLを取得
      toast.loading('定期実行: URL取得中...', { id: 'auto-run' });
      const result = await fetchUnsummarizedUrls({ limit: 1000 });

      if (result.urls.length === 0) {
        toast.success('定期実行: 未まとめURLがありません。待機中...', { id: 'auto-run' });
        setLastRunTime(new Date());
        consecutiveErrorsRef.current = 0; // エラーカウントリセット
        isAutoRunningRef.current = false;
        return false; // URLがない
      }

      // 2. URLをセット
      setUrls(result.urls.join('\n'));
      toast.success(`定期実行: ${result.count}件のURLを処理開始`, { id: 'auto-run' });

      // 3. 一括処理を開始
      const urlList = result.urls;
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
      let consecutiveFailures = 0; // このサイクル内での連続失敗

      for (let i = 0; i < urlList.length; i++) {
        if (shouldStopRef.current) {
          toast('定期実行を停止しました', { icon: '⏹️' });
          break;
        }

        const url = urlList[i];
        setStatus(prev => ({
          ...prev,
          currentIndex: i,
          currentUrl: url,
        }));

        let success = false;
        let lastError = '';
        const maxRetries = 2; // 最大2回試行（初回 + リトライ1回）

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const attemptMsg = attempt > 1 ? ` (リトライ ${attempt - 1}回目)` : '';
            toast.loading(`定期実行 (${i + 1}/${urlList.length}) 処理中...${attemptMsg}`, { id: 'bulk-progress' });
            await onBulkProcess(url);

            if (shouldStopRef.current) break;

            success = true;
            break;
          } catch (error) {
            console.error(`Auto run error (attempt ${attempt}):`, error);
            lastError = error instanceof Error ? error.message : 'Unknown error';

            // スキップ可能なエラーの場合はリトライ
            if (isSkippableError(lastError) && attempt < maxRetries) {
              toast(`定期実行 (${i + 1}/${urlList.length}) エラー発生、リトライします...`, { icon: '🔄', id: 'bulk-progress' });
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機してからリトライ
              continue;
            }

            // スキップ不可のエラー（投稿エラーなど）の場合は即座に中断
            if (!isSkippableError(lastError)) {
              failedCount++;
              consecutiveFailures++;
              consecutiveErrorsRef.current++;
              setStatus(prev => ({
                ...prev,
                failedUrls: [...prev.failedUrls, { url, error: lastError }],
              }));
              toast.error(`定期実行 (${i + 1}/${urlList.length}) エラー: ${lastError}`, { id: 'bulk-progress' });
              toast.error('投稿エラーが発生したため定期実行を停止しました', { duration: 5000 });
              setAutoRunEnabled(false);
              shouldStopRef.current = true;
              break;
            }
          }
        }

        // 停止チェック
        if (shouldStopRef.current) {
          break;
        }

        if (success) {
          completedCount++;
          consecutiveFailures = 0; // 成功したらリセット
          consecutiveErrorsRef.current = 0; // 全体のエラーカウントもリセット
          setStatus(prev => ({
            ...prev,
            completedUrls: [...prev.completedUrls, url],
          }));

          toast.success(`定期実行 (${i + 1}/${urlList.length}) 完了`, { id: 'bulk-progress' });

          if (i < urlList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else if (!shouldStopRef.current) {
          // リトライ後も失敗した場合（スキップして次へ進む）
          failedCount++;
          consecutiveFailures++;
          setStatus(prev => ({
            ...prev,
            failedUrls: [...prev.failedUrls, { url, error: lastError }],
          }));
          toast.error(`定期実行 (${i + 1}/${urlList.length}) 取得失敗: ${lastError}（スキップ）`, { id: 'bulk-progress' });

          // スレメモくんにスキップ済みとしてマーク（次回取得リストから除外）
          try {
            await markThreadAsSkipped(url, lastError);
          } catch (skipError) {
            console.error('Failed to mark as skipped:', skipError);
          }

          // スキップして次のURLに進む
          if (i < urlList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      setStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentUrl: null,
      }));

      setLastRunTime(new Date());
      toast.success(`定期実行完了: ${completedCount}件成功, ${failedCount}件失敗`, { id: 'bulk-progress' });

      // 停止されていなければ、まだURLがある可能性を返す
      return !shouldStopRef.current;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Auto run cycle error:', errorMsg);
      toast.error(`定期実行エラー: ${errorMsg}`, { id: 'auto-run' });

      // スキップ可能なエラーはカウントしない
      if (!isSkippableError(errorMsg)) {
        consecutiveErrorsRef.current++;

        // 連続エラーが上限に達したら停止
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          toast.error(`連続${MAX_CONSECUTIVE_ERRORS}回の致命的エラーが発生したため、定期実行を停止します`, { duration: 5000 });
          setAutoRunEnabled(false);
        }
      }
      return false;
    } finally {
      isAutoRunningRef.current = false;
    }
  }, [onBulkProcess]);

  // 定期実行のメインループ（処理完了後に再チェック）
  const startAutoRunLoop = useCallback(async () => {
    if (!autoRunEnabled) return;

    // 処理を実行
    const hasMoreUrls = await runAutoProcessCycle();

    if (!autoRunEnabled) return; // 途中で無効化された場合

    if (hasMoreUrls) {
      // まだURLがある可能性があるので、すぐに再チェック
      toast('未まとめURLを再チェック中...', { icon: '🔄' });
      await new Promise(resolve => setTimeout(resolve, 3000)); // 少し待ってから再チェック
      startAutoRunLoop(); // 再帰的に呼び出し
    } else {
      // URLがないので、指定時間待機
      const nextRun = new Date(Date.now() + autoRunInterval * 60 * 1000);
      setNextRunTime(nextRun);
    }
  }, [autoRunEnabled, autoRunInterval, runAutoProcessCycle]);

  // 定期実行のタイマー管理
  useEffect(() => {
    if (autoRunEnabled) {
      // エラーカウントをリセット
      consecutiveErrorsRef.current = 0;

      // すぐに1回目を実行開始
      toast.success(`定期実行を開始しました（未まとめがなくなったら${autoRunInterval}分ごとに再チェック）`);
      startAutoRunLoop();

      // 指定間隔でも定期的に実行（バックアップ用）
      autoRunTimerRef.current = setInterval(() => {
        if (!isAutoRunningRef.current) {
          startAutoRunLoop();
        }
      }, autoRunInterval * 60 * 1000);
    } else {
      // タイマー停止
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
      setNextRunTime(null);
      consecutiveErrorsRef.current = 0;
    }

    return () => {
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
      }
    };
  }, [autoRunEnabled, autoRunInterval, startAutoRunLoop]);

  // 次回実行までの残り時間を表示用にフォーマット
  const formatTimeRemaining = (targetTime: Date): string => {
    const now = new Date();
    const diff = targetTime.getTime() - now.getTime();
    if (diff <= 0) return '実行中...';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  // 1秒ごとに残り時間を更新
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!autoRunEnabled || !nextRunTime) return;

    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRunEnabled, nextRunTime]);

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
            <details className="mt-2" open>
              <summary className="text-sm text-red-600 cursor-pointer font-medium">▼ 失敗したURL</summary>
              <ul className="mt-2 text-xs space-y-2 max-h-60 overflow-y-auto">
                {status.failedUrls.map((f, i) => (
                  <li key={i} className="bg-red-50 rounded p-2 border border-red-200">
                    <div className="text-gray-700 font-mono text-xs break-all mb-1">{f.url}</div>
                    <div className="text-red-600 break-words">{f.error}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* 定期自動処理 */}
      <div className="mt-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          定期自動処理
        </h4>

        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRunEnabled}
              onChange={(e) => setAutoRunEnabled(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              disabled={isProcessing}
            />
            <span className="text-sm font-medium text-gray-700">
              {autoRunInterval}分ごとに自動実行
            </span>
          </label>

          <select
            value={autoRunInterval}
            onChange={(e) => setAutoRunInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-green-500 focus:border-green-500"
            disabled={autoRunEnabled || isProcessing}
          >
            <option value={10}>10分</option>
            <option value={15}>15分</option>
            <option value={30}>30分</option>
            <option value={60}>60分</option>
          </select>
        </div>

        {autoRunEnabled && (
          <div className="bg-white rounded-lg p-3 border border-green-200 text-sm space-y-1">
            <p className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {status.isProcessing ? '処理中' : '待機中'}
              </span>
              <span className="text-gray-600">
                {status.isProcessing
                  ? `${status.currentIndex + 1}/${status.totalCount}件を処理中...`
                  : nextRunTime
                    ? `次回チェック: ${formatTimeRemaining(nextRunTime)}`
                    : '処理完了後に再チェックします'}
              </span>
            </p>
            {lastRunTime && (
              <p className="text-gray-500 text-xs">
                前回実行: {lastRunTime.toLocaleTimeString('ja-JP')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
