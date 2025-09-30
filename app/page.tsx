'use client';

import { useState } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import { fetchTalk, fetchAllComments } from '@/lib/shikutoku-api';
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

  // HTMLモーダルを開く際に自動生成
  const openHTMLModal = () => {
    if (!currentTalk || selectedComments.length === 0) {
      toast.error('コメントを選択してください');
      return;
    }
    setShowHTMLModal(true);
  };

  const handleLoadTalk = async (talkId: string) => {
    setLoading(true);
    setComments([]); // 既存のコメントをクリア
    resetHistory(); // 履歴もリセット

    try {
      const talk = await fetchTalk(talkId);
      if (!talk) {
        toast.error('トークが見つかりません');
        setLoading(false);
        return;
      }

      setCurrentTalk(talk);
      toast.success(`「${talk.title}」を読み込みました`);

      const allComments = await fetchAllComments(talkId);
      setComments(allComments);
    } catch (error) {
      // 開発環境のみエラーログを出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading talk:', error);
      }

      // エラーメッセージをより具体的に表示
      if (error instanceof Error) {
        if (error.message.includes('見つかりません')) {
          toast.error('指定されたトークIDが見つかりません');
        } else if (error.message.includes('Failed to fetch')) {
          toast.error('サーバーへの接続に失敗しました');
        } else {
          toast.error(`エラー: ${error.message}`);
        }
      } else {
        toast.error('読み込みエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };;

  return (
    <div className="space-y-6">

      {/* メインフォーム */}
      <div className="space-y-6">
        <div className="relative">
          <TalkLoader
            onLoad={handleLoadTalk}
            currentTalk={currentTalk}
            commentsCount={comments.length}
          />
          {loading && (
            <div className="absolute inset-0 bg-white/90 rounded-3xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          )}
        </div>

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
            />

            {/* HTML生成ボタン */}
            {selectedComments.length > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={openHTMLModal}
                  className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:from-sky-600 hover:to-cyan-600 transform hover:scale-105 transition-all flex items-center gap-2"
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
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">タグ発行</h2>
                <button
                  onClick={() => setShowHTMLModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                  onClose={() => setShowHTMLModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="mt-16 pt-8 border-t border-gray-200">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <a
              href="https://shikutoku.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-lg hover:from-sky-600 hover:to-cyan-600 transition-all font-bold text-xs shadow-md"
            >
              Shikutoku（シクトク）へ
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://shikutoku.me/talks/6501"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-pink-600 hover:text-pink-700 font-medium text-xs"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              ご意見ご要望
            </a>
            <a
              href="https://shikutoku.me/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700 font-medium text-xs"
            >
              お問い合わせ
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            対応希望の掲示板様も募集中です。
          </p>
        </div>
      </div>
    </div>
  );
}