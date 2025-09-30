import { Talk, Comment } from './types';
import { logger } from './logger';

// プロキシAPIを使用してCORS問題を回避
const API_BASE = '/api/proxy';

export async function fetchTalk(talkId: string): Promise<Talk | null> {
  try {
    const response = await fetch(`${API_BASE}/getTalk?id=${talkId}`);
    if (!response.ok) throw new Error('Failed to fetch talk');
    const data = await response.json();
    return data.data;
  } catch (error) {
    logger.error('Error fetching talk:', error);
    return null;
  }
}

export async function fetchComments(talkId: string, page: number = 1): Promise<Comment[]> {
  try {
    // 最大20ページ（1000件）まで対応
    if (page > 20) {
      return []; // 21ページ目以降は空配列を返す
    }

    // ページ番号から範囲を計算（1ページ50件）
    const from = (page - 1) * 50 + 1;
    const to = page * 50;
    
    const response = await fetch(`${API_BASE}/getComments?talk_id=${talkId}&page=${from}-${to}`);
    
    const data = await response.json();
    
    // エラーレスポンスの処理
    if (!response.ok) {
      if (response.status === 404) {
        logger.error('Talk not found:', talkId);
        throw new Error('指定されたトークが見つかりません');
      }
      throw new Error(data.error || 'Failed to fetch comments');
    }
    
    // APIレスポンスの構造: { data: { comments: [...], pagination: {...}, totalCount: N } }
    if (data.data && data.data.comments) {
      return data.data.comments;
    }
    return [];
  } catch (error) {
    logger.error('Error fetching comments:', error);
    // エラーを再スローして呼び出し元で処理できるようにする
    throw error;
  }
}

export async function fetchAllComments(talkId: string): Promise<Comment[]> {
  const allComments: Comment[] = [];
  let page = 1;
  let hasMore = true;

  // 最大20ページ（1000件）まで取得可能にする
  while (hasMore && page <= 20) {
    const comments = await fetchComments(talkId, page);
    if (comments.length === 0) {
      hasMore = false;
    } else {
      allComments.push(...comments);
      // 50件未満なら最後のページ
      if (comments.length < 50) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allComments;
}

// URLからトークIDを抽出
export function extractTalkIdFromUrl(url: string): string | null {
  const patterns = [
    /shikutoku\.me\/talks\/(\d+)/,
    /^(\d+)$/  // 直接ID入力
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}