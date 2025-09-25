import { Talk, Comment } from './types';

// プロキシAPIを使用してCORS問題を回避
const API_BASE = '/api/proxy';

export async function fetchTalk(talkId: string): Promise<Talk | null> {
  try {
    const response = await fetch(`${API_BASE}/getTalk?id=${talkId}`);
    if (!response.ok) throw new Error('Failed to fetch talk');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching talk:', error);
    return null;
  }
}

export async function fetchComments(talkId: string, page: number = 1): Promise<Comment[]> {
  try {
    const response = await fetch(`${API_BASE}/getComments?talk_id=${talkId}&page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function fetchAllComments(talkId: string): Promise<Comment[]> {
  const allComments: Comment[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const comments = await fetchComments(talkId, page);
    if (comments.length === 0) {
      hasMore = false;
    } else {
      allComments.push(...comments);
      page++;
      // 最大10ページまで（500コメント）
      if (page > 10) hasMore = false;
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