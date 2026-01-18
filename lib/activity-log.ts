// Client-side activity logging utility
// Sends activity logs to the server for analytics

type LogAction =
  | 'ai_summarize'      // AIまとめ実行
  | 'ai_thumbnail'      // AIサムネイル生成
  | 'post_blog'         // ブログ投稿
  | 'bulk_process'      // 一括処理
  | 'error';            // エラー

interface LogDetails {
  // Common
  error?: string;

  // AI Summarize
  threadUrl?: string;
  commentCount?: number;
  selectedCount?: number;

  // AI Thumbnail
  title?: string;
  character?: string;

  // Blog Post
  blogId?: string;
  blogType?: string;

  // Bulk Process
  urlCount?: number;
  successCount?: number;
  failCount?: number;
}

/**
 * Log an activity to the server
 * Non-blocking - failures are silently ignored
 */
export async function logActivity(action: LogAction, details?: LogDetails): Promise<void> {
  try {
    // Fire and forget - don't await or block
    fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ action, details }),
    }).catch(() => {
      // Silently ignore logging failures
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Log an error
 */
export function logError(error: string, context?: Record<string, unknown>): void {
  logActivity('error', { error, ...context });
}
