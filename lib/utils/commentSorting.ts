import { Comment } from '@/lib/types';
import { extractAnchor } from './commentFormatters';

/**
 * コメントを階層的に並び替える
 * アンカー（>>番号）による返信関係を考慮して、親コメントの下に返信を配置
 *
 * @param comments - 並び替え対象のコメント配列
 * @returns 並び替え後のコメント配列
 */
export function arrangeCommentsByAnchor(comments: Comment[]): Comment[] {
  const result: Comment[] = [];
  const processed = new Set<string>();

  // アンカーによる返信関係をマップ化
  const repliesMap = new Map<number, Comment[]>();

  comments.forEach(comment => {
    const anchorId = extractAnchor(comment.body);
    if (anchorId !== null) {
      // アンカーがある場合、該当番号への返信としてマップに追加
      if (!repliesMap.has(anchorId)) {
        repliesMap.set(anchorId, []);
      }
      repliesMap.get(anchorId)!.push(comment);
    }
  });

  // 再帰的にコメントとその返信を追加する関数
  const addCommentWithReplies = (comment: Comment) => {
    if (processed.has(comment.id)) return;

    result.push(comment);
    processed.add(comment.id);

    // このコメントへの返信を追加
    const replies = repliesMap.get(Number(comment.res_id));
    if (replies) {
      // 返信をres_id順でソート
      replies.sort((a, b) => Number(a.res_id) - Number(b.res_id));
      replies.forEach(reply => {
        addCommentWithReplies(reply);
      });
    }
  };

  // res_id順でソート
  const sortedComments = [...comments].sort((a, b) => Number(a.res_id) - Number(b.res_id));

  // すべてのコメントを処理
  sortedComments.forEach(comment => {
    if (!processed.has(comment.id)) {
      // アンカーがない、または参照先が存在しないコメントから開始
      const anchorId = extractAnchor(comment.body);
      if (anchorId === null || !comments.some(c => Number(c.res_id) === anchorId)) {
        addCommentWithReplies(comment);
      }
    }
  });

  // 処理されていないコメントがあれば追加（孤立したコメント）
  sortedComments.forEach(comment => {
    if (!processed.has(comment.id)) {
      result.push(comment);
      processed.add(comment.id);
    }
  });

  return result;
}