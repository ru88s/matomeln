'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchUnsummarizedUrls, fetchGirlsChannelUrls, fetchTalkUrls, BulkProcessStatus, getInitialBulkStatus, markThreadAsSkipped } from '@/lib/bulk-processing';
import { logActivity } from '@/lib/activity-log';
import toast from 'react-hot-toast';

// エラーを確実に文字列に変換するヘルパー関数
function stringifyError(error: unknown): string {
  // null/undefined
  if (error == null) {
    return 'エラーが発生しました（詳細不明）';
  }

  // 既に文字列の場合
  if (typeof error === 'string') {
    // "[object Object]" という文字列なら詳細不明に変換
    if (error === '[object Object]' || error.includes('[object ')) {
      return 'エラーの詳細を取得できませんでした';
    }
    return error;
  }

  // Errorインスタンス
  if (error instanceof Error) {
    // メッセージがある場合
    if (error.message && error.message.trim() && !error.message.includes('[object ')) {
      return error.message;
    }
    // メッセージが空の場合、スタックトレースから情報を抽出
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      // 最初の行（エラー名: メッセージ）を取得
      const firstLine = stackLines[0];
      if (firstLine && firstLine.trim() && firstLine !== 'Error') {
        return firstLine.trim();
      }
    }
    // nameだけでも返す
    return `エラー: ${error.name || 'Unknown'}`;
  }

  // Response オブジェクト（fetch APIのエラー）
  if (typeof Response !== 'undefined' && error instanceof Response) {
    return `HTTP Error: ${error.status} ${error.statusText || 'Unknown'}`;
  }

  // オブジェクトの場合
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // よくあるエラーオブジェクトのプロパティをチェック（再帰的に文字列化）
    if (typeof obj.message === 'string' && !obj.message.includes('[object ')) return obj.message;
    if (typeof obj.error === 'string' && !obj.error.includes('[object ')) return obj.error;
    if (typeof obj.msg === 'string' && !obj.msg.includes('[object ')) return obj.msg;
    if (typeof obj.detail === 'string' && !obj.detail.includes('[object ')) return obj.detail;
    if (typeof obj.details === 'string' && !obj.details.includes('[object ')) return obj.details;

    // ネストしたerrorプロパティもチェック
    if (obj.error && typeof obj.error === 'object') {
      const nestedError = obj.error as Record<string, unknown>;
      if (typeof nestedError.message === 'string') return nestedError.message;
    }

    // JSON.stringifyを試す
    try {
      const json = JSON.stringify(error, null, 0);
      // 空オブジェクトや短すぎる場合
      if (json === '{}' || json.length < 3) {
        return 'エラーの詳細を取得できませんでした';
      }
      // [object Object]を含まないか確認
      if (json.includes('[object ')) {
        return 'エラーの詳細を取得できませんでした';
      }
      return json;
    } catch {
      // 循環参照などでJSON化できない場合
      return 'エラーの詳細を取得できませんでした';
    }
  }

  // その他（number, booleanなど）
  const str = String(error);
  if (str.includes('[object ')) {
    return 'エラーの詳細を取得できませんでした';
  }
  return str;
}

// エラーメッセージを安全に表示用文字列に変換
function safeErrorDisplay(error: unknown): string {
  const str = stringifyError(error);
  // 最終チェック: [object を含む場合は置換
  if (str.includes('[object ')) {
    return 'エラーの詳細を取得できませんでした';
  }
  return str;
}

// 状態保存用に安全な文字列を返す
function sanitizeErrorForState(error: string): string {
  if (typeof error !== 'string') {
    return 'エラーの詳細を取得できませんでした';
  }
  if (error.includes('[object ')) {
    return 'エラーの詳細を取得できませんでした';
  }
  return error;
}

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
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingTalk, setIsFetchingTalk] = useState(false);
  const [isFetchingGC, setIsFetchingGC] = useState(false);
  // useRefで停止フラグを管理（クロージャ問題を回避）
  const shouldStopRef = useRef(false);

  // 定期実行機能: 対象選択と実行状態を分ける
  const [autoRun5chEnabled, setAutoRun5chEnabled] = useState(() => {
    return true;
  });
  const [autoRunTalkEnabled, setAutoRunTalkEnabled] = useState(() => {
    return true;
  });
  const [autoRunGCEnabled, setAutoRunGCEnabled] = useState(() => {
    return true;
  });
  const [autoRunActive, setAutoRunActive] = useState(false);
  const [autoRunInterval, setAutoRunInterval] = useState(() => {
    if (typeof window === 'undefined') return 30;
    const saved = localStorage.getItem('autoRunInterval');
    return saved ? Number(saved) : 30;
  }); // 分
  // サムネイルプロバイダー表示用
  const [thumbnailProvider, setThumbnailProvider] = useState<string>(() => {
    if (typeof window === 'undefined') return 'gemini';
    return localStorage.getItem('matomeln_thumbnail_provider') || 'gemini';
  });
  const [openaiImageModel, setOpenaiImageModel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'gpt-image-1';
    return localStorage.getItem('matomeln_openai_image_model') || 'gpt-image-1';
  });
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [currentAutoRunSource, setCurrentAutoRunSource] = useState<'5ch' | 'talk' | 'gc' | null>(null);
  const autoRunTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoRunningRef = useRef(false);
  const consecutiveErrorsRef = useRef(0); // 連続エラー回数（投稿エラーなど致命的なもののみ）
  const MAX_CONSECUTIVE_ERRORS = 20; // 連続エラー上限（スキップ可能なエラーはカウントしない）
  const [autoRunPortalTarget, setAutoRunPortalTarget] = useState<HTMLElement | null>(null);
  const hasAutoRunTargets = autoRun5chEnabled || autoRunTalkEnabled || autoRunGCEnabled;
  const autoRunEnabled = autoRunActive;

  // 初回マウント完了フラグ（ハイドレーション問題を回避）
  const isInitialMountRef = useRef(true);

  // クライアントサイドでlocalStorageから状態を復元（ハイドレーション後）
  useEffect(() => {
    const saved5ch = localStorage.getItem('autoRun5chSelected');
    const savedTalk = localStorage.getItem('autoRunTalkSelected');
    const savedGC = localStorage.getItem('autoRunGCSelected');
    const savedInterval = localStorage.getItem('autoRunInterval');

    setAutoRunActive(false);
    localStorage.setItem('autoRunActive', 'false');
    if (saved5ch !== null) setAutoRun5chEnabled(saved5ch === 'true');
    if (savedTalk !== null) setAutoRunTalkEnabled(savedTalk === 'true');
    if (savedGC !== null) setAutoRunGCEnabled(savedGC === 'true');
    if (savedInterval && Number(savedInterval) !== autoRunInterval) {
      setAutoRunInterval(Number(savedInterval));
    }

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 定期実行設定をlocalStorageに保存（初回マウント後のみ）
  // 重要: これらのeffectは復元effectの後に宣言すること
  useEffect(() => {
    if (isInitialMountRef.current) return;
    localStorage.setItem('autoRun5chSelected', String(autoRun5chEnabled));
  }, [autoRun5chEnabled]);

  useEffect(() => {
    if (isInitialMountRef.current) return;
    localStorage.setItem('autoRunTalkSelected', String(autoRunTalkEnabled));
  }, [autoRunTalkEnabled]);

  useEffect(() => {
    if (isInitialMountRef.current) return;
    localStorage.setItem('autoRunGCSelected', String(autoRunGCEnabled));
  }, [autoRunGCEnabled]);

  useEffect(() => {
    if (isInitialMountRef.current) return;
    localStorage.setItem('autoRunInterval', String(autoRunInterval));
  }, [autoRunInterval]);

  // 初回マウント完了フラグをセット（保存effectの後に宣言することで、
  // 初回レンダーの保存effectがisInitialMountRef=trueを見てスキップすることを保証）
  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  useEffect(() => {
    setAutoRunPortalTarget(document.getElementById('bulk-auto-run-sidebar-slot'));
  }, []);

  // サムネイルプロバイダーの変更を監視
  useEffect(() => {
    const handleStorage = () => {
      setThumbnailProvider(localStorage.getItem('matomeln_thumbnail_provider') || 'gemini');
      setOpenaiImageModel(localStorage.getItem('matomeln_openai_image_model') || 'gpt-image-1');
    };
    window.addEventListener('storage', handleStorage);
    // 同一タブでの変更も検知するためintervalで定期チェック
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // 未まとめURL取得（5ch）
  const handleFetchUrls = useCallback(async () => {
    setIsFetching(true);
    const toastId = toast.loading('未まとめURLを取得中...');

    try {
      const result = await fetchUnsummarizedUrls({ limit: 1000, source: '5ch' });
      setUrls(result.urls.join('\n'));
      toast.success(`${result.count}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(stringifyError(error), { id: toastId });
    } finally {
      setIsFetching(false);
    }
  }, []);

  const handleFetchAllUrls = useCallback(async () => {
    setIsFetchingAll(true);
    const toastId = toast.loading('すべての未まとめURLを取得中...');

    try {
      const [fiveChResult, talkResult, girlsChannelResult] = await Promise.all([
        fetchUnsummarizedUrls({ limit: 1000, source: '5ch' }),
        fetchTalkUrls({ limit: 1000 }),
        fetchGirlsChannelUrls({ limit: 100 }),
      ]);
      const mergedUrls = [
        ...fiveChResult.urls,
        ...talkResult.urls,
        ...girlsChannelResult.urls,
      ].filter((url, index, allUrls) => allUrls.indexOf(url) === index);
      setUrls(mergedUrls.join('\n'));
      toast.success(`${mergedUrls.length}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch all error:', error);
      toast.error(stringifyError(error), { id: toastId });
    } finally {
      setIsFetchingAll(false);
    }
  }, []);

  const handleFetchTalkUrls = useCallback(async () => {
    setIsFetchingTalk(true);
    const toastId = toast.loading('Talk未まとめURLを取得中...');

    try {
      const result = await fetchTalkUrls({ limit: 1000 });
      setUrls(result.urls.join('\n'));
      toast.success(`${result.count}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch Talk error:', error);
      toast.error(stringifyError(error), { id: toastId });
    } finally {
      setIsFetchingTalk(false);
    }
  }, []);

  // ガールズちゃんねる未まとめURL取得
  const handleFetchGirlsChannelUrls = useCallback(async () => {
    setIsFetchingGC(true);
    const toastId = toast.loading('ガルちゃん未まとめURLを取得中...');

    try {
      const result = await fetchGirlsChannelUrls({ limit: 100 });
      setUrls(result.urls.join('\n'));
      toast.success(`${result.count}件のURLを取得しました`, { id: toastId });
    } catch (error) {
      console.error('Fetch GirlsChannel error:', error);
      toast.error(stringifyError(error), { id: toastId });
    } finally {
      setIsFetchingGC(false);
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
      'タイムアウト',
      // 5ch取得エラー（スレッドが存在しない・削除済み）
      'スレッドが見つかりませんでした',
      '見つかりませんでした',
      '削除されて',
      '存在しない',
      '5chスレッドの取得に失敗しました',
      'スレッドタイトルの取得に失敗しました',
      'スレッドデータの解析に失敗しました',
      'DATファイルが見つかりませんでした',
      'アクセスが制限されている',
      '取得に失敗',
      'の取得に失敗しました',
      // HTTPエラー（404など）
      '404',
      'Not Found',
      'Failed to fetch',
      '403',
      'Forbidden',
      '500',
      '502',
      '503',
      'Internal server error',
      'Server error',
      'network error',
      'ECONNREFUSED',
      'ETIMEDOUT',
      // ガールズちゃんねるエラー
      'トピックの取得に失敗',
      'Invalid GirlsChannel',
      'girlschannel',
      // Shikutokuログイン必須トーク（loginEnabled=true）
      'Login required',
      'login required',
      'ログインが必要',
      'UNAUTHORIZED',
      '401',
      // コンテンツ検証エラー
      'タイトルが空のため投稿できません',
      '本文が空のため投稿できません',
      // 過去ログ化
      '過去ログ',
      // 投稿制限（一時的なエラーの可能性）
      '投稿制限中',
      '制限中の可能性',
      // 文字化け
      '文字化け',
      // 汎用エラー（スキップして次へ進む）
      'エラー: Error',
      'エラーの詳細を取得できませんでした',
      'エラーが発生しました',
      '一括処理に失敗しました',
      'API呼び出しに失敗',
      'fetch failed',
      'Load failed',
      'NetworkError',
      'TypeError',
      'SyntaxError',
      // JSONパースエラー（HTMLが返ってきた場合など）
      'Unexpected token',
      'is not valid JSON',
      '<!DOCTYPE',
      'JSON.parse',
      'JSON Parse error',
      // CAPTCHAやブロック
      'CAPTCHA',
      'アクセスをブロック',
      'ブロックされている',
      '応答を解析できませんでした',
      // コンテンツフィルター
      'アダルトコンテンツ',
      'スキップ',
    ];
    return skippablePatterns.some(pattern => errorMsg.toLowerCase().includes(pattern.toLowerCase()));
  };

  // Anthropic APIのクレジット残高不足エラーを判定
  const isCreditBalanceError = (errorMsg: string): boolean => {
    const msg = errorMsg.toLowerCase();
    return msg.includes('credit balance is too low')
      || msg.includes('credit balance')
      || (msg.includes('plans & billing') && msg.includes('anthropic'));
  };

  // クレジット残高不足時に定期実行をオフにする
  const disableAutoRunForCreditError = useCallback(() => {
    setAutoRunActive(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoRunActive', 'false');
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
          console.error(`Error type: ${typeof error}, constructor: ${error?.constructor?.name}`);
          console.error(`Error keys:`, error && typeof error === 'object' ? Object.keys(error) : 'N/A');
          // エラーを確実に文字列に変換
          lastError = stringifyError(error);
          // 追加チェック: [object が含まれていたら置換
          if (lastError.includes('[object ')) {
            console.error('CRITICAL: stringifyError returned [object], original error:', error);
            lastError = 'エラーの詳細を取得できませんでした';
          }
          console.error(`Stringified error: ${lastError}`);

          // スキップ可能なエラーの場合はリトライ
          if (isSkippableError(lastError) && attempt < maxRetries) {
            toast(`(${i + 1}/${urlList.length}) エラー発生、リトライします...`, { icon: '🔄', id: 'bulk-progress' });
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機してからリトライ
            continue;
          }

          // スキップ不可のエラー（投稿エラーなど）の場合は即座に中断
          if (!isSkippableError(lastError)) {
            failedCount++;
            const safeError = sanitizeErrorForState(lastError);
            failedUrlsList.push({ url, error: safeError });
            setStatus(prev => ({
              ...prev,
              failedUrls: [...prev.failedUrls, { url, error: safeError }],
            }));
            toast.error(`(${i + 1}/${urlList.length}) エラー: ${safeError}`, { id: 'bulk-progress' });
            if (isCreditBalanceError(lastError)) {
              toast.error('Claude APIのクレジット残高不足です。Anthropic Consoleで補充してください: https://console.anthropic.com/settings/billing', { duration: 10000 });
              disableAutoRunForCreditError();
            } else {
              toast.error('投稿エラーが発生したため処理を中断しました', { duration: 5000 });
            }
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
        const safeError = sanitizeErrorForState(lastError);
        failedUrlsList.push({ url, error: safeError });
        setStatus(prev => ({
          ...prev,
          failedUrls: [...prev.failedUrls, { url, error: safeError }],
        }));
        toast.error(`(${i + 1}/${urlList.length}) 取得失敗: ${safeError}（スキップ）`, { id: 'bulk-progress' });

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

    // ログ記録
    logActivity('bulk_process', {
      urlCount: urlList.length,
      successCount: completedCount,
      failCount: failedCount,
    });
  }, [urls, onBulkProcess]);

  // 停止
  const handleStop = useCallback(() => {
    shouldStopRef.current = true;
    toast('停止処理中...', { icon: '⏳' });
  }, []);

  // 定期実行: 1サイクル実行（処理完了後に再度URL取得して続行）
  const runAutoProcessCycle = useCallback(async (source: '5ch' | 'talk' | 'gc'): Promise<boolean> => {
    // 戻り値: true = 未まとめURLがまだある, false = 未まとめURLがない
    if (isAutoRunningRef.current) return false;
    isAutoRunningRef.current = true;
    setCurrentAutoRunSource(source);

    const sourceLabel = source === '5ch' ? '5ch' : source === 'talk' ? 'Talk' : 'ガルちゃん';

    try {
      // 1. 未まとめURLを取得（ソースに応じて異なるAPI）
      toast.loading(`定期実行[${sourceLabel}]: URL取得中...`, { id: 'auto-run' });
      const result = source === '5ch'
        ? await fetchUnsummarizedUrls({ limit: 1000, source: '5ch' })
        : source === 'talk'
          ? await fetchTalkUrls({ limit: 1000 })
          : await fetchGirlsChannelUrls({ limit: 100 });

      if (result.urls.length === 0) {
        toast.success(`定期実行[${sourceLabel}]: 未まとめURLがありません`, { id: 'auto-run' });
        setLastRunTime(new Date());
        consecutiveErrorsRef.current = 0; // エラーカウントリセット
        isAutoRunningRef.current = false;
        setCurrentAutoRunSource(null);
        return false; // URLがない
      }

      // 2. URLをセット
      setUrls(result.urls.join('\n'));
      toast.success(`定期実行[${sourceLabel}]: ${result.count}件のURLを処理開始`, { id: 'auto-run' });

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
          toast(`定期実行[${sourceLabel}]を停止しました`, { icon: '⏹️' });
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
            toast.loading(`[${sourceLabel}] (${i + 1}/${urlList.length}) 処理中...${attemptMsg}`, { id: 'bulk-progress' });
            await onBulkProcess(url);

            if (shouldStopRef.current) break;

            success = true;
            break;
          } catch (error) {
            console.error(`Auto run error (attempt ${attempt}):`, error);
            // エラーを確実に文字列に変換
            lastError = stringifyError(error);
            // 追加チェック: [object が含まれていたら置換
            if (lastError.includes('[object ')) {
              console.error('CRITICAL: stringifyError returned [object], original error:', error);
              lastError = 'エラーの詳細を取得できませんでした';
            }

            // スキップ可能なエラーの場合はリトライ
            if (isSkippableError(lastError) && attempt < maxRetries) {
              toast(`[${sourceLabel}] (${i + 1}/${urlList.length}) エラー発生、リトライします...`, { icon: '🔄', id: 'bulk-progress' });
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機してからリトライ
              continue;
            }

            // スキップ不可のエラー（投稿エラーなど）の場合は即座に中断
            // ただしチェックボックスは外さない（ユーザー設定を尊重）
            if (!isSkippableError(lastError)) {
              failedCount++;
              consecutiveFailures++;
              consecutiveErrorsRef.current++;
              const safeError = sanitizeErrorForState(lastError);
              setStatus(prev => ({
                ...prev,
                failedUrls: [...prev.failedUrls, { url, error: safeError }],
              }));
              toast.error(`[${sourceLabel}] (${i + 1}/${urlList.length}) エラー: ${safeError}`, { id: 'bulk-progress' });
              if (isCreditBalanceError(lastError)) {
                toast.error('Claude APIのクレジット残高不足です。定期実行をオフにしました。Anthropic Consoleで補充後、再度オンにしてください: https://console.anthropic.com/settings/billing', { duration: 12000 });
                disableAutoRunForCreditError();
              } else {
                toast.error(`投稿エラーが発生したため処理を一時停止しました。次回チェック時に再試行します`, { duration: 5000 });
              }
              // クレジット残高不足以外はチェックボックスを外さない（次回チェック時に再試行）
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

          toast.success(`[${sourceLabel}] (${i + 1}/${urlList.length}) 完了`, { id: 'bulk-progress' });

          if (i < urlList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else if (!shouldStopRef.current) {
          // リトライ後も失敗した場合（スキップして次へ進む）
          failedCount++;
          consecutiveFailures++;
          const safeError = sanitizeErrorForState(lastError);
          setStatus(prev => ({
            ...prev,
            failedUrls: [...prev.failedUrls, { url, error: safeError }],
          }));
          toast.error(`[${sourceLabel}] (${i + 1}/${urlList.length}) 取得失敗: ${safeError}（スキップ）`, { id: 'bulk-progress' });

          // スレメモくんにスキップ済みとしてマーク（次回取得リストから除外）
          try {
            await markThreadAsSkipped(url, safeError);
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
      setCurrentAutoRunSource(null);
      toast.success(`[${sourceLabel}]完了: ${completedCount}件成功, ${failedCount}件失敗`, { id: 'bulk-progress' });

      // ログ記録
      logActivity('bulk_process', {
        urlCount: urlList.length,
        successCount: completedCount,
        failCount: failedCount,
      });

      // 停止されていなければ、まだURLがある可能性を返す
      return !shouldStopRef.current;
    } catch (error) {
      // エラーを確実に文字列に変換
      const errorMsg = stringifyError(error);
      console.error('Auto run cycle error:', errorMsg);
      toast.error(`定期実行[${sourceLabel}]エラー: ${errorMsg}`, { id: 'auto-run' });

      // スキップ可能なエラーはカウントしない
      if (!isSkippableError(errorMsg)) {
        consecutiveErrorsRef.current++;

        // 連続エラーが上限に達したら一時停止（チェックボックスは外さない）
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          toast.error(`連続${MAX_CONSECUTIVE_ERRORS}回のエラーが発生したため一時停止します。次回チェック時に再試行します`, { duration: 5000 });
          // チェックボックスは外さない（ユーザー設定を尊重）
        }
      }
      return false;
    } finally {
      isAutoRunningRef.current = false;
      setCurrentAutoRunSource(null);
    }
  }, [onBulkProcess]);

  // 定期実行のメインループをrefで保持（useEffect依存を避ける）
  const startAutoRunLoopRef = useRef<(() => Promise<void>) | null>(null);

  // 定期実行のメインループ（処理完了後に再チェック）
  startAutoRunLoopRef.current = async () => {
    if (!autoRunActive || !hasAutoRunTargets) return;

    const enabledSources: Array<'5ch' | 'talk' | 'gc'> = [];
    if (autoRun5chEnabled) enabledSources.push('5ch');
    if (autoRunTalkEnabled) enabledSources.push('talk');
    if (autoRunGCEnabled) enabledSources.push('gc');

    let processedAnySource = false;

    for (const source of enabledSources) {
      if (!autoRunActive || shouldStopRef.current) return;
      const hadUrls = await runAutoProcessCycle(source);
      processedAnySource = processedAnySource || hadUrls;
    }

    if (processedAnySource && autoRunActive && !shouldStopRef.current) {
      toast('選択中の未まとめを再チェック中...', { icon: '🔄' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      startAutoRunLoopRef.current?.();
      return;
    }

    // どちらもURLがないので、指定時間待機
    const nextRun = new Date(Date.now() + autoRunInterval * 60 * 1000);
    setNextRunTime(nextRun);
  };

  const isProcessing = status.isProcessing || isProcessingAI;
  const isFetchingAny = isFetchingAll || isFetching || isFetchingTalk || isFetchingGC;

  const startAutoRun = useCallback(() => {
    if (!hasAutoRunTargets) {
      toast.error('定期処理の対象を1つ以上選択してください');
      return;
    }
    if (isProcessing) {
      toast.error('処理中は定期処理を開始できません');
      return;
    }

    consecutiveErrorsRef.current = 0;
    shouldStopRef.current = false;
    setNextRunTime(null);
    setAutoRunActive(true);
    localStorage.setItem('autoRunActive', 'true');
  }, [hasAutoRunTargets, isProcessing]);

  const stopAutoRun = useCallback(() => {
    shouldStopRef.current = true;
    setAutoRunActive(false);
    setNextRunTime(null);
    consecutiveErrorsRef.current = 0;
    localStorage.setItem('autoRunActive', 'false');
    if (autoRunTimerRef.current) {
      clearInterval(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    toast('定期実行を停止しました', { icon: '⏹️' });
  }, []);

  useEffect(() => {
    if (!autoRunActive) {
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
      setNextRunTime(null);
      return;
    }

    const sources = [];
    if (autoRun5chEnabled) sources.push('5ch');
    if (autoRunTalkEnabled) sources.push('Talk');
    if (autoRunGCEnabled) sources.push('ガルちゃん');
    toast.success(`定期実行[${sources.join('・')}]を開始しました（${autoRunInterval}分間隔）`);
    startAutoRunLoopRef.current?.();

    autoRunTimerRef.current = setInterval(() => {
      if (!isAutoRunningRef.current) {
        startAutoRunLoopRef.current?.();
      }
    }, autoRunInterval * 60 * 1000);

    return () => {
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    };
  }, [autoRunActive, autoRun5chEnabled, autoRunTalkEnabled, autoRunGCEnabled, autoRunInterval]);

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

  const activeSources = [
    autoRun5chEnabled ? '5ch' : null,
    autoRunTalkEnabled ? 'Talk' : null,
    autoRunGCEnabled ? 'ガルちゃん' : null,
  ].filter(Boolean).join(' / ');
  const ToggleOption = ({
    checked,
    disabled,
    label,
    subLabel,
    tone,
    onChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    label: string;
    subLabel?: string;
    tone: 'green' | 'indigo' | 'cyan' | 'pink';
    onChange: (checked: boolean) => void;
  }) => {
    const toneClass = {
      green: checked ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700 hover:border-green-300',
      indigo: checked ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300',
      cyan: checked ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-300',
      pink: checked ? 'border-pink-300 bg-pink-50 text-pink-800' : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300',
    }[tone];

    return (
      <label
        className={`block w-full rounded-lg border px-3 py-2 text-left transition-all ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${toneClass}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold">{label}</span>
            {subLabel && <span className="block truncate text-[11px] text-gray-500 mt-0.5">{subLabel}</span>}
          </span>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="h-5 w-5 flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:cursor-not-allowed"
          />
        </span>
      </label>
    );
  };
  const autoRunControls = (
    <div className="rounded-xl border border-green-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className="font-bold text-gray-800 flex items-center gap-2 text-xs">
        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        定期自動処理
        </h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${autoRunEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {autoRunEnabled ? '実行中' : '停止中'}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <ToggleOption
          checked={autoRun5chEnabled && autoRunTalkEnabled && autoRunGCEnabled}
          disabled={autoRunEnabled}
          label="すべて"
          subLabel="5ch + Talk + ガルちゃん"
          tone="green"
          onChange={(checked) => {
            setAutoRun5chEnabled(checked);
            setAutoRunTalkEnabled(checked);
            setAutoRunGCEnabled(checked);
          }}
        />

        <ToggleOption
          checked={autoRun5chEnabled}
          disabled={autoRunEnabled}
          label="5ch"
          tone="indigo"
          onChange={setAutoRun5chEnabled}
        />
        <ToggleOption
          checked={autoRunTalkEnabled}
          disabled={autoRunEnabled}
          label="Talk"
          tone="cyan"
          onChange={setAutoRunTalkEnabled}
        />
        <ToggleOption
          checked={autoRunGCEnabled}
          disabled={autoRunEnabled}
          label="ガルちゃん"
          tone="pink"
          onChange={setAutoRunGCEnabled}
        />
      </div>

      <label className="block mb-3">
        <span className="block text-xs text-gray-600 mb-1">チェック間隔</span>
        <select
          value={autoRunInterval}
          onChange={(e) => setAutoRunInterval(Number(e.target.value))}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-green-500 focus:border-green-500 bg-white"
          disabled={autoRunEnabled || isProcessing}
        >
          <option value={10}>10分</option>
          <option value={15}>15分</option>
          <option value={30}>30分</option>
          <option value={60}>60分</option>
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={startAutoRun}
          disabled={autoRunEnabled || isProcessing || !hasAutoRunTargets}
          className="h-9 rounded-lg bg-green-600 px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
        >
          スタート
        </button>
        <button
          type="button"
          onClick={stopAutoRun}
          disabled={!autoRunEnabled}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          停止
        </button>
      </div>

      {autoRunEnabled && (
        <div className="rounded-lg border border-green-200 bg-green-50/60 p-2.5 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
              status.isProcessing
                ? currentAutoRunSource === '5ch'
                  ? 'bg-indigo-100 text-indigo-800'
                  : currentAutoRunSource === 'talk'
                    ? 'bg-cyan-100 text-cyan-800'
                    : 'bg-pink-100 text-pink-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {status.isProcessing
                ? currentAutoRunSource === '5ch' ? '5ch処理中' : currentAutoRunSource === 'talk' ? 'Talk処理中' : 'ガルちゃん処理中'
                : '待機中'}
            </span>
            <span className="text-[11px] font-medium text-gray-500">{activeSources}</span>
          </div>
          <div className="rounded-md bg-white px-2 py-2 text-gray-700 shadow-sm">
            <span className="block leading-relaxed">
              {status.isProcessing
                ? `${status.currentIndex + 1}/${status.totalCount}件を処理中...`
                : nextRunTime
                  ? `次回チェックまで ${formatTimeRemaining(nextRunTime)}`
                  : '処理完了後に再チェックします'}
            </span>
            {nextRunTime && !status.isProcessing && (
              <span className="mt-1 block text-[11px] text-gray-500">
                開始予定: {nextRunTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {lastRunTime && (
            <p className="text-[11px] text-gray-500">
              前回実行: {lastRunTime.toLocaleTimeString('ja-JP')}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        一括AIまとめ
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">
          まとめ: Claude
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
          thumbnailProvider === 'openai'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          サムネ: {thumbnailProvider === 'openai' ? (openaiImageModel === 'gpt-image-1-mini' ? 'OpenAI Mini' : 'OpenAI') : 'Gemini'}
        </span>
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
          placeholder="https://hayabusa9.5ch.io/test/read.cgi/news/1234567890/&#10;# コメント行は無視されます&#10;https://..."
          disabled={isProcessing}
        />
      </div>

      {/* ボタン群 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
        <button
          onClick={handleFetchAllUrls}
          disabled={isProcessing || isFetchingAny}
          className="h-11 rounded-lg border border-green-200 bg-white px-3 text-sm font-bold text-green-700 shadow-sm transition-all hover:border-green-300 hover:bg-green-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isFetchingAll ? (
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
              すべて取得
            </>
          )}
        </button>

        <button
          onClick={handleFetchUrls}
          disabled={isProcessing || isFetchingAny}
          className="h-11 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
              5ch取得
            </>
          )}
        </button>

        <button
          onClick={handleFetchTalkUrls}
          disabled={isProcessing || isFetchingAny}
          className="h-11 rounded-lg border border-cyan-200 bg-white px-3 text-sm font-bold text-cyan-700 shadow-sm transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isFetchingTalk ? (
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
              Talk取得
            </>
          )}
        </button>

        <button
          onClick={handleFetchGirlsChannelUrls}
          disabled={isProcessing || isFetchingAny}
          className="h-11 rounded-lg border border-pink-200 bg-white px-3 text-sm font-bold text-pink-700 shadow-sm transition-all hover:border-pink-300 hover:bg-pink-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isFetchingGC ? (
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
              ガルちゃん取得
            </>
          )}
        </button>

        {!status.isProcessing ? (
          <button
            onClick={handleStartBulk}
            disabled={isProcessing || !urls.trim()}
            className="h-11 rounded-lg bg-indigo-600 px-4 font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:col-span-4 flex items-center justify-center gap-2 cursor-pointer"
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
            className="h-11 rounded-lg bg-red-500 px-4 font-bold text-white shadow-sm transition-all hover:bg-red-600 hover:shadow sm:col-span-4 flex items-center justify-center gap-2 cursor-pointer"
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
              処理中: <a href={status.currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{status.currentUrl}</a>
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
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs break-all mb-1 block">{f.url}</a>
                    <div className="text-red-600 break-words">{safeErrorDisplay(f.error)}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {autoRunPortalTarget ? createPortal(autoRunControls, autoRunPortalTarget) : null}
    </div>
  );
}
