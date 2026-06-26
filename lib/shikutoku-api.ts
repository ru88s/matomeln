import { Talk, Comment } from './types';
import { logger } from './logger';
import { detectSourceType, fetch5chThread, parse5chUrl, fetchOpen2chThread, parseOpen2chUrl, fetch2chscThread, parse2chscUrl, fetchGirlsChannelThread, parseGirlsChannelUrl, fetchTalkJpThread, parseTalkJpUrl } from './5ch-api';
import { fetchLivedoorMatomeArticle, parseLivedoorMatomeUrl } from './livedoor-matome-api';

// プロキシAPIを使用してCORS問題を回避
const API_BASE = '/api/proxy';

function normalizeCommentBody(body: string): string {
  return String(body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
}

function normalizeComments(comments: Comment[]): Comment[] {
  return comments.map(comment => ({
    ...comment,
    body: normalizeCommentBody(comment.body),
  }));
}

export async function fetchTalk(talkId: string): Promise<Talk | null> {
  try {
    const response = await fetch(`${API_BASE}/getTalk?id=${talkId}`);
    if (!response.ok) throw new Error('Failed to fetch talk');
    const data = await response.json() as { data: Talk };
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

    interface CommentsResponse {
      error?: string;
      data?: {
        comments: Comment[];
        pagination?: unknown;
        totalCount?: number;
      };
    }
    const data = await response.json() as CommentsResponse;

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
      return normalizeComments(data.data.comments);
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

// URLからトークIDを抽出（シクトク用）
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

// URLまたはIDからデータを取得（シクトク/5ch/open2ch/2ch.sc/girlschannel/talk.jp/まとめ記事対応）
export interface ThreadData {
  talk: Talk;
  comments: Comment[];
  source: '5ch' | 'open2ch' | '2chsc' | 'girlschannel' | 'talkjp' | 'matomeBlog';
}

export async function fetchThreadData(input: string): Promise<ThreadData> {
  const sourceType = detectSourceType(input);

  if (sourceType === '5ch') {
    // 5chスレッドを取得
    const result = await fetch5chThread(input);
    if (!result) {
      throw new Error('5chスレッドの取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: '5ch',
    };
  }

  if (sourceType === 'open2ch') {
    // open2chスレッドを取得
    const result = await fetchOpen2chThread(input);
    if (!result) {
      throw new Error('open2chスレッドの取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: 'open2ch',
    };
  }

  if (sourceType === '2chsc') {
    // 2ch.scスレッドを取得
    const result = await fetch2chscThread(input);
    if (!result) {
      throw new Error('2ch.scスレッドの取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: '2chsc',
    };
  }

  if (sourceType === 'girlschannel') {
    // ガールズちゃんねるトピックを取得
    const result = await fetchGirlsChannelThread(input);
    if (!result) {
      throw new Error('ガールズちゃんねるトピックの取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: 'girlschannel',
    };
  }

  if (sourceType === 'talkjp') {
    const result = await fetchTalkJpThread(input);
    if (!result) {
      throw new Error('talk.jpスレッドの取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: 'talkjp',
    };
  }

  if (sourceType === 'matomeBlog') {
    // livedoor系まとめ記事を取得
    const result = await fetchLivedoorMatomeArticle(input);
    if (!result) {
      throw new Error('まとめ記事の取得に失敗しました');
    }
    return {
      talk: result.talk,
      comments: result.comments,
      source: 'matomeBlog',
    };
  }

  // unknownの場合は対応URLを案内
  if (sourceType === 'unknown') {
    throw new Error('対応していないURLです。5ch / open2ch / 2ch.sc / ガールズちゃんねる / talk.jp / livedoor系まとめ記事 のURLを入力してください。');
  }

  throw new Error('対応していないURLです。5ch / open2ch / 2ch.sc / ガールズちゃんねる / talk.jp / livedoor系まとめ記事 のURLを入力してください。');
}

// Re-export for convenience
export { detectSourceType, parse5chUrl, parseOpen2chUrl, parse2chscUrl, parseGirlsChannelUrl, parseTalkJpUrl, parseLivedoorMatomeUrl };
