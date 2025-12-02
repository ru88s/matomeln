'use client';

import { useState, useEffect, useCallback } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import SettingsSidebar from '@/components/SettingsSidebar';
import SettingsModal from '@/components/SettingsModal';
import { fetchThreadData } from '@/lib/shikutoku-api';
import { Talk, Comment, CommentWithStyle, BlogSettings } from '@/lib/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { callClaudeAPI } from '@/lib/ai-summarize';
import toast from 'react-hot-toast';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const {
    value: selectedComments,
    setValue: setSelectedComments,
    canUndo,
    canRedo,
    undo,
    redo,
    reset: resetHistory
  } = useUndoRedo<CommentWithStyle[]>({
    initialState: [],
    maxHistorySize: 30
  });
  const [showHTMLModal, setShowHTMLModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<{ source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc'; originalUrl: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customNameBold, setCustomNameBold] = useState(true);
  const [customNameColor, setCustomNameColor] = useState('#ff69b4');
  const [commentColors, setCommentColors] = useState<Record<string, string>>({});
  const [commentSizes, setCommentSizes] = useState<Record<string, number>>({});
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [blogs, setBlogs] = useState<BlogSettings[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [showIdInHtml, setShowIdInHtml] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  // 設定をローカルストレージから読み込み
  useEffect(() => {
    const savedNameSettings = localStorage.getItem('customNameSettings');
    if (savedNameSettings) {
      const settings = JSON.parse(savedNameSettings);
      setCustomName(settings.name || '');
      setCustomNameBold(settings.bold !== false);
      setCustomNameColor(settings.color || '#ff69b4');
    }
    const savedThumbnail = localStorage.getItem('matomeThumbnailUrl');
    if (savedThumbnail) {
      setThumbnailUrl(savedThumbnail);
    }
    // ID表示設定を読み込み
    const savedShowIdInHtml = localStorage.getItem('showIdInHtml');
    if (savedShowIdInHtml !== null) {
      setShowIdInHtml(savedShowIdInHtml === 'true');
    }
    // 開発者モードを読み込み
    const savedDevMode = localStorage.getItem('matomeln_dev_mode');
    if (savedDevMode === 'true') {
      setIsDevMode(true);
    }
    // ブログ設定を読み込み
    const savedBlogs = localStorage.getItem('blogSettingsList');
    if (savedBlogs) {
      const blogsList = JSON.parse(savedBlogs) as BlogSettings[];
      setBlogs(blogsList);
      // 選択中のブログIDを読み込み
      const savedSelectedId = localStorage.getItem('selectedBlogId');
      if (savedSelectedId && blogsList.some(b => b.id === savedSelectedId)) {
        setSelectedBlogId(savedSelectedId);
      } else if (blogsList.length > 0) {
        setSelectedBlogId(blogsList[0].id);
      }
    } else {
      // 旧形式のAPI設定があれば移行
      const savedApiSettings = localStorage.getItem('livedoorBlogApiSettings');
      if (savedApiSettings) {
        const oldSettings = JSON.parse(savedApiSettings);
        if (oldSettings.blogUrl && oldSettings.apiKey) {
          const migratedBlog: BlogSettings = {
            id: crypto.randomUUID(),
            name: oldSettings.blogUrl,
            blogId: oldSettings.blogUrl,
            apiKey: oldSettings.apiKey,
          };
          setBlogs([migratedBlog]);
          setSelectedBlogId(migratedBlog.id);
          localStorage.setItem('blogSettingsList', JSON.stringify([migratedBlog]));
          localStorage.setItem('selectedBlogId', migratedBlog.id);
        }
      }
    }
  }, []);

  // レス名設定をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('customNameSettings', JSON.stringify({
      name: customName,
      bold: customNameBold,
      color: customNameColor
    }));
  }, [customName, customNameBold, customNameColor]);

  // 選択中のブログ設定
  const selectedBlog = blogs.find(b => b.id === selectedBlogId);
  const apiSettings = selectedBlog
    ? { blogUrl: selectedBlog.blogId, apiKey: selectedBlog.apiKey }
    : { blogUrl: '', apiKey: '' };

  // ブログ設定の更新
  const handleBlogsChange = useCallback((newBlogs: BlogSettings[]) => {
    setBlogs(newBlogs);
    localStorage.setItem('blogSettingsList', JSON.stringify(newBlogs));
  }, []);

  // 選択中のブログIDの更新
  const handleSelectedBlogIdChange = useCallback((id: string | null) => {
    setSelectedBlogId(id);
    if (id) {
      localStorage.setItem('selectedBlogId', id);
    } else {
      localStorage.removeItem('selectedBlogId');
    }
  }, []);

  // ID表示設定の更新
  const handleShowIdInHtmlChange = useCallback((show: boolean) => {
    setShowIdInHtml(show);
    localStorage.setItem('showIdInHtml', String(show));
  }, []);

  // スレ主のID
  const firstPosterId = comments[0]?.name_id;

  // スレ主のコメントを全選択
  const selectFirstPoster = useCallback(() => {
    if (!firstPosterId) return;
    const firstPosterComments = comments.filter(c => c.name_id === firstPosterId);
    const newSelected = firstPosterComments.map(c => {
      const existing = selectedComments.find(sc => sc.id === c.id);
      if (existing) return existing;
      const sizeValue = commentSizes[c.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      return {
        ...c,
        body: editedComments[c.id] || c.body,
        color: commentColors[c.id] || '#ef4444',
        fontSize
      };
    });
    // 既存の選択に追加（重複を除く）
    const existingIds = new Set(selectedComments.map(sc => sc.id));
    const toAdd = newSelected.filter(c => !existingIds.has(c.id));
    setSelectedComments([...selectedComments, ...toAdd]);
  }, [comments, firstPosterId, selectedComments, setSelectedComments, commentColors, commentSizes, editedComments]);

  // スレ主のコメントの色を一括変更
  const changeFirstPosterColor = useCallback((color: string) => {
    if (!firstPosterId) return;
    const firstPosterIds = new Set(comments.filter(c => c.name_id === firstPosterId).map(c => c.id));

    // 色情報を更新
    const newColors = { ...commentColors };
    firstPosterIds.forEach(id => {
      newColors[id] = color;
    });
    setCommentColors(newColors);

    // 選択済みコメントの色を更新
    const updated = selectedComments.map(c =>
      firstPosterIds.has(c.id) ? { ...c, color } : c
    );
    setSelectedComments(updated);
  }, [comments, firstPosterId, selectedComments, setSelectedComments, commentColors]);

  // 全て選択
  const selectAll = useCallback(() => {
    const allComments = comments.map(c => {
      const sizeValue = commentSizes[c.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      return {
        ...c,
        body: editedComments[c.id] || c.body,
        color: commentColors[c.id] || '#000000',
        fontSize
      };
    });
    setSelectedComments(allComments);
  }, [comments, commentColors, commentSizes, editedComments, setSelectedComments]);

  // 選択解除
  const deselectAll = useCallback(() => {
    setSelectedComments([]);
  }, [setSelectedComments]);

  // サムネイルURL変更
  const handleThumbnailUrlChange = useCallback((url: string) => {
    setThumbnailUrl(url);
    localStorage.setItem('matomeThumbnailUrl', url);
  }, []);

  // HTMLモーダルを開く際に自動生成
  const openHTMLModal = useCallback(() => {
    if (!currentTalk || selectedComments.length === 0) {
      toast.error('コメントを選択してください');
      return;
    }
    setShowHTMLModal(true);
  }, [currentTalk, selectedComments.length]);

  // Ctrl+Enter / Cmd+Enter でタグ発行モーダルを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モーダルが開いている場合や、入力フォーカス中は無視
      if (showHTMLModal) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        openHTMLModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHTMLModal, openHTMLModal]);

  // Headerからの設定モーダルを開くイベントをリッスン
  useEffect(() => {
    const handleOpenSettingsModal = () => {
      setShowSettingsModal(true);
    };

    window.addEventListener('openSettingsModal', handleOpenSettingsModal);
    return () => window.removeEventListener('openSettingsModal', handleOpenSettingsModal);
  }, []);

  // AIまとめ機能
  const handleAISummarize = async () => {
    if (!currentTalk) {
      toast.error('スレッドを読み込んでください');
      return;
    }

    if (comments.length === 0) {
      toast.error('コメントがありません');
      return;
    }

    // Claude APIキーを取得
    const apiKey = localStorage.getItem('matomeln_claude_api_key');
    if (!apiKey) {
      toast.error('Claude APIキーが設定されていません。設定ページで入力してください。');
      return;
    }

    setGeneratingAI(true);
    const toastId = toast.loading('AIがレスを分析中...');

    try {
      const aiResponse = await callClaudeAPI(apiKey, currentTalk.title, comments);

      // AIの選択結果をCommentWithStyle[]に変換
      const colorMap: Record<string, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#22c55e'
      };

      const newSelectedComments: CommentWithStyle[] = [];
      const newCommentColors: Record<string, string> = { ...commentColors };
      const newCommentSizes: Record<string, number> = { ...commentSizes };

      // 選択されたレスを処理
      for (const post of aiResponse.selected_posts) {
        const comment = comments[post.post_number - 1];
        if (!comment) continue;

        // 色を設定
        const color = post.decorations.color ? colorMap[post.decorations.color] : '#000000';
        newCommentColors[comment.id] = color;

        // サイズを設定（large = 22px, 通常 = 18px）
        const size = post.decorations.size_boost === 'large' ? 22 : 18;
        newCommentSizes[comment.id] = size;

        // CommentWithStyleを作成
        const fontSize: 'small' | 'medium' | 'large' = size === 22 ? 'large' : 'medium';
        newSelectedComments.push({
          ...comment,
          body: editedComments[comment.id] || comment.body,
          color,
          fontSize
        });
      }

      // post_number順にソート
      newSelectedComments.sort((a, b) => {
        const aNum = parseInt(a.res_id);
        const bNum = parseInt(b.res_id);
        return aNum - bNum;
      });

      // 状態を更新
      setCommentColors(newCommentColors);
      setCommentSizes(newCommentSizes);
      setSelectedComments(newSelectedComments);

      toast.success(`${newSelectedComments.length}件のレスを選択しました`, { id: toastId });
    } catch (error) {
      console.error('AI summarize error:', error);
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error('AIまとめに失敗しました', { id: toastId });
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleLoadThread = async (input: string) => {
    setLoading(true);
    setComments([]); // 既存のコメントをクリア
    resetHistory(); // 履歴もリセット

    try {
      const { talk, comments: loadedComments, source } = await fetchThreadData(input);

      setCurrentTalk(talk);
      setComments(loadedComments);
      setSourceInfo({ source, originalUrl: input });

      const sourceLabel = source === '5ch' ? '5ch' : source === 'open2ch' ? 'open2ch' : source === '2chsc' ? '2ch.sc' : 'Shikutoku';
      toast.success(`「${talk.title}」を読み込みました（${sourceLabel}）`);
    } catch (error) {
      // 開発環境のみエラーログを出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading thread:', error);
      }

      // エラーメッセージをより具体的に表示
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('読み込みエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="relative">
          <TalkLoader
            onLoad={handleLoadThread}
            currentTalk={currentTalk}
            commentsCount={comments.length}
            thumbnailUrl={thumbnailUrl}
            onThumbnailUrlChange={handleThumbnailUrlChange}
            apiSettings={apiSettings}
          />
          {loading && (
            <div className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}
        </div>

        {currentTalk && isDevMode && comments.length > 0 && (
          <>
            {/* AIまとめボタン（開発者モードのみ） */}
            <div className="flex justify-end">
              <button
                onClick={handleAISummarize}
                disabled={generatingAI}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                {generatingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    AIが分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AIでまとめる
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {comments.length > 0 && (
          <>
            <CommentPicker
              comments={comments}
              selectedComments={selectedComments}
              onSelectionChange={setSelectedComments}
              showId={currentTalk?.show_id}
              customName={customName}
              customNameBold={customNameBold}
              customNameColor={customNameColor}
              showOnlySelected={showOnlySelected}
            />

            {/* HTML生成ボタン */}
            {selectedComments.length > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={openHTMLModal}
                  className="bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:from-orange-500 hover:to-pink-500 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  タグを発行 ({selectedComments.length}件)
                  <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">{typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+Enter</kbd>
                </button>
              </div>
            )}

            {/* 上下スクロールボタン */}
            <div className="fixed top-1/2 left-4 -translate-y-1/2 z-40 flex flex-col gap-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                title="ページの先頭へ"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                title="ページの末尾へ"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* HTMLモーダル */}
        {showHTMLModal && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="html-modal-title"
          >
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <h2 id="html-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </span>
                    タグ発行
                  </h2>
                  {selectedBlog && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>
                      {selectedBlog.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowHTMLModal(false)}
                  className="p-2 hover:bg-orange-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label="閉じる"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                <HTMLGenerator
                  talk={currentTalk}
                  selectedComments={selectedComments}
                  sourceInfo={sourceInfo}
                  onClose={() => setShowHTMLModal(false)}
                  customName={customName}
                  customNameBold={customNameBold}
                  customNameColor={customNameColor}
                  thumbnailUrl={thumbnailUrl}
                  apiSettings={apiSettings}
                  selectedBlogName={selectedBlog?.name}
                  showIdInHtml={showIdInHtml}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* サイドバー */}
      <SettingsSidebar
        comments={comments}
        onSelectFirstPoster={selectFirstPoster}
        onChangeFirstPosterColor={changeFirstPosterColor}
        selectedCount={selectedComments.length}
        totalCount={comments.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showOnlySelected={showOnlySelected}
        onShowOnlySelectedChange={setShowOnlySelected}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDevMode={isDevMode}
        onDevModeChange={setIsDevMode}
        customName={customName}
        onCustomNameChange={setCustomName}
        customNameBold={customNameBold}
        onCustomNameBoldChange={setCustomNameBold}
        customNameColor={customNameColor}
        onCustomNameColorChange={setCustomNameColor}
        showIdInHtml={showIdInHtml}
        onShowIdInHtmlChange={handleShowIdInHtmlChange}
        blogs={blogs}
        selectedBlogId={selectedBlogId}
        onBlogsChange={handleBlogsChange}
        onSelectedBlogIdChange={handleSelectedBlogIdChange}
      />
    </div>
  );
}