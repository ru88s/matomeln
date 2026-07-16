import type { Comment, CommentWithStyle } from './types';

export function extractCommentAnchor(body: string): number | null {
  const match = body.match(/>>(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function buildDisplayCommentOrder(
  comments: Comment[],
  positions: Record<string, number>,
  edits: Record<string, string>,
): Array<Comment & { body: string; sortKey: number }> {
  const existingResponseIds = new Set(comments.map((comment) => Number(comment.res_id)));
  const replies = new Map<number, Comment[]>();
  const anchoredCommentIds = new Set<string>();

  for (const comment of comments) {
    const anchorId = extractCommentAnchor(edits[comment.id] || comment.body);
    if (anchorId === null || !existingResponseIds.has(anchorId)) continue;
    replies.set(anchorId, [...(replies.get(anchorId) || []), comment]);
    anchoredCommentIds.add(comment.id);
  }

  const ordered: Array<Comment & { body: string; sortKey: number }> = [];
  let fallbackPosition = 0;
  const append = (comment: Comment) => {
    ordered.push({
      ...comment,
      body: edits[comment.id] || comment.body,
      sortKey: positions[comment.id] ?? fallbackPosition,
    });
    fallbackPosition += 1;
  };

  for (const comment of comments) {
    if (anchoredCommentIds.has(comment.id)) continue;
    append(comment);
    const commentReplies = replies.get(Number(comment.res_id)) || [];
    commentReplies.sort((left, right) => Number(left.res_id) - Number(right.res_id));
    commentReplies.forEach(append);
  }

  return ordered.sort((left, right) => left.sortKey - right.sortKey);
}

export function orderSelectedCommentsByDisplay(
  selected: CommentWithStyle[],
  displayComments: Comment[],
): CommentWithStyle[] {
  const displayOrder = new Map(displayComments.map((comment, index) => [comment.id, index]));
  return [...selected].sort((left, right) => {
    const leftOrder = displayOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = displayOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder !== rightOrder
      ? leftOrder - rightOrder
      : Number(left.res_id) - Number(right.res_id);
  });
}

export function sortCommentsByAnchorOrder(comments: CommentWithStyle[]): CommentWithStyle[] {
  if (comments.length === 0) return [];
  const byResponseId = new Map(comments.map((comment) => [Number(comment.res_id), comment]));
  const replies = new Map<number, CommentWithStyle[]>();
  const childIds = new Set<string>();

  for (const comment of comments) {
    const anchorId = extractCommentAnchor(comment.body);
    if (anchorId === null || !byResponseId.has(anchorId)) continue;
    replies.set(anchorId, [...(replies.get(anchorId) || []), comment]);
    childIds.add(comment.id);
  }
  replies.forEach((items) => items.sort((a, b) => Number(a.res_id) - Number(b.res_id)));

  const result: CommentWithStyle[] = [];
  const added = new Set<string>();
  const visiting = new Set<string>();
  const append = (comment: CommentWithStyle) => {
    if (added.has(comment.id)) return;
    if (visiting.has(comment.id)) {
      result.push(comment);
      added.add(comment.id);
      return;
    }
    visiting.add(comment.id);
    result.push(comment);
    added.add(comment.id);
    (replies.get(Number(comment.res_id)) || []).forEach(append);
    visiting.delete(comment.id);
  };

  [...comments]
    .sort((a, b) => Number(a.res_id) - Number(b.res_id))
    .filter((comment) => !childIds.has(comment.id))
    .forEach(append);
  comments.forEach(append);
  return result;
}

export function keepFirstResponseFirst(comments: CommentWithStyle[]): CommentWithStyle[] {
  const index = comments.findIndex((comment) => Number(comment.res_id) === 1);
  return index <= 0
    ? comments
    : [comments[index], ...comments.slice(0, index), ...comments.slice(index + 1)];
}
