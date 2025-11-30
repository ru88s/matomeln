'use client';

import { useState, useEffect } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import { fetchThreadData } from '@/lib/shikutoku-api';
import { Talk, Comment, CommentWithStyle } from '@/lib/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';
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
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<{ source: 'shikutoku' | '5ch'; originalUrl: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customNameBold, setCustomNameBold] = useState(true);
  const [customNameColor, setCustomNameColor] = useState('#ff69b4');

  // レス名設定をローカルストレージから読み込み
  useEffect(() => {
    const savedNameSettings = localStorage.getItem('customNameSettings');
    if (savedNameSettings) {
      const settings = JSON.parse(savedNameSettings);
      setCustomName(settings.name || '');
      setCustomNameBold(settings.bold !== false);
      setCustomNameColor(settings.color || '#ff69b4');
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

  // HTMLモーダルを開く際に自動生成
  const openHTMLModal = () => {
    if (!currentTalk || selectedComments.length === 0) {
      toast.error('コメントを選択してください');
      return;
    }
    setShowHTMLModal(true);
  };

  const handleGenerateAIComments = async () => {
    if (!currentTalk) {
      toast.error('トークを読み込んでください');
      return;
    }

    // 毎回20件追加
    const generateCount = 20;

    setGeneratingAI(true);
    try {
      const response = await fetch('/api/generate-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          talkTitle: currentTalk.title,
          talkBody: currentTalk.body,
          existingComments: comments.length > 0 ? comments : [{ body: currentTalk.body || currentTalk.title }],
          count: generateCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'コメント生成に失敗しました');
      }

      const data = await response.json();

      // 生成されたコメントをComment型に変換して追加
      // 最後のコメントの時刻を基準にする
      const lastComment = comments[comments.length - 1];
      const baseTime = lastComment ? new Date(lastComment.created_at) : new Date();

      const newComments: Comment[] = data.comments.map((body: string, index: number) => {
        // 各コメントの投稿時刻を前のコメントから1-5分後に設定
        const minutesAfter = Math.floor(Math.random() * 4) + 1; // 1-5分
        const commentTime = new Date(baseTime.getTime() + (index * minutesAfter * 60 * 1000));

        return {
          id: `ai-${Date.now()}-${index}`,
          res_id: `${comments.length + index + 1}`,
          name: '匿名',
          body,
          talk_id: currentTalk.id,
          created_at: commentTime.toISOString(),
          images: [],
        };
      });

      setComments([...comments, ...newComments]);
      toast.success(`${newComments.length}件のコメントを生成しました`);
    } catch (error) {
      console.error('AI comment generation error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('コメント生成に失敗しました');
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

      const sourceLabel = source === '5ch' ? '5ch' : 'Shikutoku';
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
    <div className="space-y-6">

      {/* メインフォーム */}
      <div className="space-y-6">
        <div className="relative">
          <TalkLoader
            onLoad={handleLoadThread}
            currentTalk={currentTalk}
            commentsCount={comments.length}
          />
          {loading && (
            <div className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}
        </div>

        {currentTalk && process.env.NODE_ENV === 'development' && (
          <>
            {/* AIコメント生成ボタン（開発環境のみ） */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateAIComments}
                disabled={generatingAI}
                className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
              >
                {generatingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    AI生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AIで20件追加
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
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              customName={customName}
              onCustomNameChange={setCustomName}
              customNameBold={customNameBold}
              onCustomNameBoldChange={setCustomNameBold}
              customNameColor={customNameColor}
              onCustomNameColorChange={setCustomNameColor}
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
                </button>
              </div>
            )}
          </>
        )}

        {/* HTMLモーダル */}
        {showHTMLModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-white/80 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </span>
                  タグ発行
                </h2>
                <button
                  onClick={() => setShowHTMLModal(false)}
                  className="p-2 hover:bg-orange-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}