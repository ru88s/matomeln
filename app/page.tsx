'use client';

import { useState } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import { fetchTalk, fetchAllComments } from '@/lib/shikutoku-api';
import { Talk, Comment } from '@/lib/types';
import toast from 'react-hot-toast';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedComments, setSelectedComments] = useState<Comment[]>([]);

  const handleLoadTalk = async (talkId: string) => {
    setLoading(true);
    try {
      const talk = await fetchTalk(talkId);
      if (!talk) {
        toast.error('トークが見つかりません');
        return;
      }

      setCurrentTalk(talk);
      toast.success(`「${talk.title}」を読み込み中...`);

      const allComments = await fetchAllComments(talkId);
      setComments(allComments);
      setSelectedComments([]);

      toast.success(`${allComments.length}件のコメントを読み込みました`);
    } catch (error) {
      console.error('Error loading talk:', error);
      toast.error('読み込みエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー - コンパクトに */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            ま
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          シクマト - Shikutokuまとめ作成ツール
        </h1>
        <p className="text-sm text-gray-600">
          話題のトークを簡単にまとめてブログ記事に
        </p>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-sky-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      )}

      {/* メインフォーム */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <TalkLoader onLoad={handleLoadTalk} currentTalk={currentTalk} />

          {comments.length > 0 && (
            <CommentPicker
              comments={comments}
              selectedComments={selectedComments}
              onSelectionChange={setSelectedComments}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <HTMLGenerator
            talk={currentTalk}
            selectedComments={selectedComments}
          />

          {/* 使い方 - コンパクトに下部に配置 */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-sky-100">
            <h3 className="font-bold text-sm text-gray-700 mb-2">🎯 かんたん3ステップ</h3>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1️⃣ ShikutokuのURLを入力</li>
              <li>2️⃣ まとめたいコメントを選択</li>
              <li>3️⃣ HTMLを生成してコピー</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 特徴 - 下部にコンパクトに */}
      <div className="grid md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-12">
        <div className="text-center">
          <div className="text-2xl mb-1">🆓</div>
          <p className="text-xs text-gray-600">完全無料</p>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">🔗</div>
          <p className="text-xs text-gray-600">自動リンク生成</p>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">✨</div>
          <p className="text-xs text-gray-600">2つのスタイル</p>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">🎯</div>
          <p className="text-xs text-gray-600">ドラッグ&ドロップ</p>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-4">
        このツールは
        <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 font-bold mx-1">
          Shikutoku（シクトク）
        </a>
        の関連サービスです
      </div>
    </div>
  );
}