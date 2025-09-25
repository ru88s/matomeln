'use client';

import { useState } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import { fetchTalk, fetchAllComments } from '@/lib/shikutoku-api';
import { Talk, Comment } from '@/lib/types';
import toast from 'react-hot-toast';

export default function CreatePage() {
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          まとめ記事を作成
        </h1>
        <p className="text-gray-600">
          Shikutokuのトークから、お気に入りのコメントを選んでまとめ記事を作成できます
        </p>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      )}

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
        </div>
      </div>
    </div>
  );
}