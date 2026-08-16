import type { Comment, CommentWithStyle } from './types';

export function extractCommentAnchor(body: string): number | null {
  return extractCommentAnchors(body)[0] ?? null;
}

/**
 * 本文内のアンカーを出現順に取り出す。
 * 掲示板ごとの表記揺れ（半角・全角・HTMLエスケープ）にも対応する。
 */
export function extractCommentAnchors(body: string): number[] {
  const anchors: number[] = [];
  const pattern = /(?:>>|＞＞|&gt;&gt;)\s*([0-9０-９]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const normalizedNumber = match[1].replace(/[０-９]/g, (digit) =>
      String.fromCharCode(
        digit.charCodeAt(0) - '０'.charCodeAt(0) + '0'.charCodeAt(0)
      )
    );
    const anchor = Number.parseInt(normalizedNumber, 10);
    if (Number.isFinite(anchor) && anchor > 0 && !anchors.includes(anchor)) {
      anchors.push(anchor);
    }
  }

  return anchors;
}

function responseNumber(comment: Comment): number {
  const number = Number(comment.res_id);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function orderValue(comment: Comment, positions: Map<string, number>): number {
  return positions.get(comment.id) ?? responseNumber(comment);
}

/**
 * アンカー先を親として、親 -> 返信 -> 返信への返信の順に並べる。
 * 取得元の配列順には依存せず、同じ階層内はレス番号順を基本にする。
 */
function arrangeByAnchor<T extends Comment>(
  comments: T[],
  getBody: (comment: T) => string,
  positions: Map<string, number>,
): T[] {
  const byResponseId = new Map<number, T>();
  const originalIndex = new Map(
    comments.map((comment, index) => [comment.id, index])
  );

  for (const comment of comments) {
    const responseId = responseNumber(comment);
    if (responseId !== Number.MAX_SAFE_INTEGER && !byResponseId.has(responseId)) {
      byResponseId.set(responseId, comment);
    }
  }

  const compare = (left: T, right: T): number => {
    const leftOrder = orderValue(left, positions);
    const rightOrder = orderValue(right, positions);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const responseDifference = responseNumber(left) - responseNumber(right);
    if (responseDifference !== 0) return responseDifference;
    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  };

  const replies = new Map<number, T[]>();
  const childIds = new Set<string>();

  for (const comment of comments) {
    const responseId = responseNumber(comment);
    const parentId = extractCommentAnchors(getBody(comment))
      .find((anchor) => anchor !== responseId && byResponseId.has(anchor));
    if (parentId === undefined) continue;

    replies.set(parentId, [...(replies.get(parentId) || []), comment]);
    childIds.add(comment.id);
  }

  replies.forEach((items) => items.sort(compare));

  const sortedComments = [...comments].sort(compare);
  const result: T[] = [];
  const added = new Set<string>();
  const append = (comment: T) => {
    if (added.has(comment.id)) return;
    added.add(comment.id);
    result.push(comment);
    (replies.get(responseNumber(comment)) || []).forEach(append);
  };

  sortedComments
    .filter((comment) => !childIds.has(comment.id))
    .forEach(append);
  // 孤立したレスや循環アンカーも漏らさず最後に追加する。
  sortedComments.forEach(append);

  return result;
}

export function buildDisplayCommentOrder(
  comments: Comment[],
  positions: Record<string, number>,
  edits: Record<string, string>,
): Array<Comment & { body: string; sortKey: number }> {
  const positionMap = new Map(Object.entries(positions));
  const ordered = arrangeByAnchor(
    comments,
    (comment) => edits[comment.id] || comment.body,
    positionMap,
  );

  return ordered.map((comment) => ({
    ...comment,
    body: edits[comment.id] || comment.body,
    sortKey: orderValue(comment, positionMap),
  }));
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

export type CommentMoveDestination =
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'end' }
  | { type: 'after-id'; commentId: string }
  | { type: 'after-res-id'; resId: string | number };

export function moveCommentInDisplayOrder<T extends Comment>(
  displayComments: T[],
  movedCommentId: string,
  destination: CommentMoveDestination,
): T[] | null {
  const currentIndex = displayComments.findIndex(comment => comment.id === movedCommentId);
  if (currentIndex === -1) return null;

  if (destination.type === 'up' || destination.type === 'down') {
    const targetIndex = destination.type === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= displayComments.length) return null;

    const nextDisplayOrder = [...displayComments];
    [nextDisplayOrder[currentIndex], nextDisplayOrder[targetIndex]] = [
      nextDisplayOrder[targetIndex],
      nextDisplayOrder[currentIndex],
    ];
    return nextDisplayOrder;
  }

  const movedComment = displayComments[currentIndex];
  const nextDisplayOrder = displayComments.filter(comment => comment.id !== movedCommentId);

  if (destination.type === 'end') {
    nextDisplayOrder.push(movedComment);
    return nextDisplayOrder;
  }

  const targetIndex = destination.type === 'after-id'
    ? nextDisplayOrder.findIndex(comment => comment.id === destination.commentId)
    : nextDisplayOrder.findIndex(comment => Number(comment.res_id) === Number(destination.resId));

  if (targetIndex === -1) return null;
  nextDisplayOrder.splice(targetIndex + 1, 0, movedComment);
  return nextDisplayOrder;
}

export function sortCommentsByAnchorOrder(comments: CommentWithStyle[]): CommentWithStyle[] {
  if (comments.length === 0) return [];
  const positions = new Map(
    comments.map((comment) => [comment.id, responseNumber(comment)])
  );
  return arrangeByAnchor(comments, (comment) => comment.body, positions);
}

export function keepFirstResponseFirst(comments: CommentWithStyle[]): CommentWithStyle[] {
  const index = comments.findIndex((comment) => Number(comment.res_id) === 1);
  return index <= 0
    ? comments
    : [comments[index], ...comments.slice(0, index), ...comments.slice(index + 1)];
}
