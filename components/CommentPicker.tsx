'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Comment, CommentWithStyle } from '@/lib/types';
import { StepHeader } from '@/components/ui/StepHeader';
import { componentStyles } from '@/lib/design-system';
import toast from 'react-hot-toast';
import { LinkCard } from '@/components/LinkCard';

interface CommentPickerProps {
  comments: Comment[];
  selectedComments: CommentWithStyle[];
  onSelectionChange: (comments: CommentWithStyle[]) => void;
  showId?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

function CommentItem({ comment, isSelected, onToggle, onColorChange, onCommentEdit, onSizeChange, color, fontSize, colorPalette, showId, onHover, isEditing, onEditingChange, onExpandImage, isFirstSelected, isInSortMode, onMoveToEnd, onMoveToTop, onMoveToPosition, onDragHandleStart }: {
  comment: Comment;
  isSelected: boolean;
  onToggle: () => void;
  onColorChange: (color: string) => void;
  onCommentEdit: (commentId: string, newBody: string) => void;
  onSizeChange: (size: 'small' | 'medium' | 'large') => void;
  color?: string;
  fontSize?: number;
  colorPalette: string[];
  showId?: boolean;
  onHover?: (commentId: string | null) => void;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onExpandImage?: (imageUrl: string) => void;
  isFirstSelected?: boolean;
  isInSortMode?: boolean;
  onMoveToEnd?: () => void;
  onMoveToTop?: () => void;
  onMoveToPosition?: (targetResId: string) => void;
  onDragHandleStart?: (e: React.DragEvent) => void;
}) {

  const [isHovered, setIsHovered] = useState(false);
  const [editingBody, setEditingBody] = useState(comment.body);
  const [targetPosition, setTargetPosition] = useState<string>('');  // 移動先番号入力用

  // 編集開始時に現在のbodyを設定
  useEffect(() => {
    if (isEditing) {
      setEditingBody(comment.body);
    }
  }, [isEditing, comment.body]);

  // 編集中にエディタ外をクリックしたら編集モードを解除
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // textareaやボタンのクリックは無視
      if (target.tagName === 'TEXTAREA' ||
          target.closest('button')?.textContent?.includes('保存') ||
          target.closest('button')?.textContent?.includes('キャンセル')) {
        return;
      }

      // それ以外のクリックで編集モード解除
      e.stopPropagation();
      onEditingChange?.(false);
      setEditingBody(comment.body);
    };

    // captureフェーズで処理して、bubbleを防ぐ
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [isEditing, comment.body, onEditingChange]);

  // ホバー中のキーボード処理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // inputフィールドにフォーカスがある場合は無視
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (!isHovered || isEditing) return;

      // スペースキーで選択切り替え（個別のコメント内では無効化）
      // グローバルハンドラーで処理するため、ここではpreventDefaultのみ
      if (e.code === 'Space') {
        e.preventDefault();
        return;
      }


      // 数字キー(1-9,0)でカラーパレット選択
      const keyNum = e.key;
      if (/^[0-9]$/.test(keyNum)) {
        e.preventDefault();
        const index = keyNum === '0' ? 9 : parseInt(keyNum) - 1;
        if (index < colorPalette.length) {
          onColorChange(colorPalette[index]);
          // 色選択時に自動的にコメントを選択状態にする
          if (!isSelected) {
            onToggle();
          }
        }
      }

      // Q, W, Eで文字サイズ変更
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        onSizeChange('large');
        if (!isSelected) {
          onToggle();
        }
      }
      if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        onSizeChange('medium');
        if (!isSelected) {
          onToggle();
        }
      }
      if (e.key.toLowerCase() === 'e' && !e.ctrlKey) {
        e.preventDefault();
        onSizeChange('small');
        if (!isSelected) {
          onToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isHovered, onToggle, onColorChange, onSizeChange, colorPalette, isSelected, isEditing]);

  const handleBodyEdit = () => {
    onCommentEdit(comment.id, editingBody);
    onEditingChange?.(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day}(${dayOfWeek}) ${hour}:${minute}:${second}`;
  };

  return (
    <div
      className={`relative border-2 rounded-2xl p-4 transition-all ${
        isSelected && !isFirstSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isSelected ? 'bg-gradient-to-r from-sky-50 to-cyan-50 border-sky-300 shadow-md' : 'bg-white/80 border-sky-100 hover:border-sky-200'
      }`}
      draggable={isSelected && !isFirstSelected}
      onDragStart={(e) => {
        if (isSelected && !isFirstSelected) {
          onDragHandleStart?.(e);
        }
      }}
      onClick={(e) => {
        // 編集中はクリックで選択状態を変更しない
        if (!isEditing) {
          onToggle();
        }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover?.(comment.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        // ホバーを外してもlastHoveredCommentIdは保持
      }}
    >
      {/* ショートカットヒント（ホバー時のみ表示） */}
      {isHovered && !isEditing && (
        <div className="absolute bottom-3 right-3 z-30">
          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded font-bold shadow-sm">Space: 選択</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          disabled={isInSortMode}
          className={`mt-1 h-5 w-5 text-sky-600 focus:ring-sky-500 border-gray-300 rounded ${
            isInSortMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 pr-10 relative">
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-500">{comment.res_id}.</span>
              <span className="text-sm text-gray-600">{comment.name}</span>
              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
              {showId && comment.name_id && (
                <span className="text-xs text-gray-400">ID: {comment.name_id}</span>
              )}
              {/* 本文バッジ */}
              {isFirstSelected && (
                <div className="absolute top-0 right-0 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded">
                    本文
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    固定
                  </span>
                </div>
              )}
              {/* 移動ボタン */}
              {isSelected && !isFirstSelected && (
                <div className="absolute top-0 right-0 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToTop?.();
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                    title="最初に移動"
                  >
                    ↑最初へ
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToEnd?.();
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                    title="最後に移動"
                  >
                    ↓最後へ
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={targetPosition}
                      onChange={(e) => {
                        e.stopPropagation();
                        setTargetPosition(e.target.value);
                      }}
                      onKeyPress={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          const targetResId = parseInt(targetPosition);
                          if (!isNaN(targetResId) && targetResId > 0) {
                            onMoveToPosition?.(targetPosition);
                            setTargetPosition('');
                          }
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-12 px-1 py-0.5 text-xs border border-gray-400 rounded"
                      placeholder="番号"
                      min="1"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetResId = parseInt(targetPosition);
                        if (!isNaN(targetResId) && targetResId > 0) {
                          onMoveToPosition?.(targetPosition);
                          setTargetPosition('');
                        }
                      }}
                      disabled={!targetPosition || isNaN(parseInt(targetPosition))}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="指定番号の下に移動"
                    >
                      移動
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* カラーパレット - 名前欗の下に表示 */}
          <div className="flex gap-1 flex-wrap mb-3 select-none">
            {colorPalette.map((paletteColor, index) => {
              const keyHint = index === 9 ? '0' : (index + 1).toString();
              return (
                <button
                  key={paletteColor}
                  className={`relative w-6 h-6 rounded border-2 transition-all hover:scale-110 cursor-pointer ${
                    color === paletteColor ? 'border-sky-500 shadow-md' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: paletteColor }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(paletteColor);
                    // 色選択時に自動的にコメントを選択状態にする
                    if (!isSelected) {
                      onToggle();
                    }
                  }}
                  title={`色を選択 (キー: ${keyHint})`}
                >
                  {isHovered && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
                      {keyHint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 文字サイズ選択 - カラーパレットの下に表示 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange('large');
                if (!isSelected) {
                  onToggle();
                }
              }}
              className={`relative px-3 py-1 text-xs rounded border transition-all cursor-pointer ${
                fontSize === 22 ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="大 (キー: Q)"
            >
              大
              {isHovered && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm border border-gray-200">
                  Q
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange('medium');
                if (!isSelected) {
                  onToggle();
                }
              }}
              className={`relative px-3 py-1 text-xs rounded border transition-all cursor-pointer ${
                fontSize === 18 ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="中 (キー: W)"
            >
              中
              {isHovered && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm border border-gray-200">
                  W
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange('small');
                if (!isSelected) {
                  onToggle();
                }
              }}
              className={`relative px-3 py-1 text-xs rounded border transition-all cursor-pointer ${
                fontSize === 14 ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="小 (キー: E)"
            >
              小
              {isHovered && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm border border-gray-200">
                  E
                </span>
              )}
            </button>
          </div>

          <div>
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={editingBody}
                  onChange={(e) => setEditingBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleBodyEdit();
                    }
                    if (e.key === 'c' && e.ctrlKey) {
                      e.preventDefault();
                      onEditingChange?.(false);
                      setEditingBody(comment.body);
                    }
                  }}
                  className="w-full p-2 border border-sky-300 rounded-lg font-bold resize-none bg-white"
                  style={{ color: color || '#000000', fontSize: `${fontSize || 18}px` }}
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center justify-end mt-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditingChange?.(false);
                      setEditingBody(comment.body);
                    }}
                    className="px-3 py-1 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    キャンセル (Ctrl+C)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBodyEdit();
                    }}
                    className="px-3 py-1 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 transition-colors font-medium"
                  >
                    保存 (Ctrl+Enter)
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <div
                  className="text-gray-900 whitespace-pre-wrap font-bold cursor-text hover:bg-gray-50 p-2 rounded -m-2"
                  style={{ color: color || '#000000', fontSize: `${fontSize || 18}px` }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEditingChange?.(true);
                  }}
                >
                  <span style={{ fontSize: `${fontSize || 18}px` }}>
                    {renderBodyWithAnchorsAndLinks(comment.body, color, fontSize)}
                  </span>
                </div>
                {/* 編集ボタン - テキストの右側に配置 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditingChange?.(true);
                  }}
                  className="absolute top-0 -right-8 p-1 bg-sky-100 hover:bg-sky-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="編集 (キー: Ctrl+E)"
                >
                  <div className="relative">
                    <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isHovered && (
                      <span className="absolute -top-1 -right-1 text-[6px] font-bold bg-white rounded-full px-1 flex items-center justify-center shadow-sm">
                        Ctrl+E
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
          {comment.images && comment.images.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {comment.images.map((image, index) => {
                  // 画像URLを適切に構築
                  let imageUrl = image;
                  if (!image.startsWith('http')) {
                    // 相対パスの場合はCDN URLを構築
                    imageUrl = `https://cdn.shikutoku.me${image.startsWith('/') ? image : '/' + image}`;
                  }
                  return (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`画像 ${index + 1}`}
                      className="h-20 w-auto rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpandImage?.(imageUrl);
                      }}
                      onError={(e) => {
                        // 画像が読み込めない場合はプレースホルダーを表示
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueDu+WDjzwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {comment.images.length}枚の画像
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// アンカー（>>番号）とURLを含むテキストを処理する関数
function renderBodyWithAnchorsAndLinks(body: string, color: string | undefined, fontSize: number | undefined) {
  // URLとアンカーのパターンを結合（URLは括弧、句読点、改行で終了）
  const pattern = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+|>>\d+)/g;
  const parts = body.split(pattern);
  const elements: React.ReactElement[] = [];

  // テキスト、アンカー、URLを出現順に処理
  parts.forEach((part, index) => {
    // URLの場合
    if (/^https?:\/\//.test(part)) {
      // Twitter/X URLは普通のテキストリンク
      if (/^https?:\/\/(twitter\.com|x\.com)\//.test(part)) {
        elements.push(
          <a
            key={`link-${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      } else {
        // その他のURLはLinkCardで表示
        elements.push(<LinkCard key={`card-${part}-${index}`} url={part} />);
      }
    }
    // アンカーの場合
    else if (/^>>\d+$/.test(part)) {
      elements.push(
        <span key={`anchor-${index}`} style={{ color: '#3b82f6', cursor: 'pointer' }}>
          {part}
        </span>
      );
    }
    // 通常のテキスト
    else if (part) {
      elements.push(<span key={`text-${index}`} style={{ color: color || '#000000' }}>{part}</span>);
    }
  });

  return elements;
}

// コメントからアンカー（>>番号）を抽出する関数
function extractAnchor(body: string): number | null {
  const match = body.match(/>>(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

// コメントを階層的に並び替える関数
function arrangeCommentsByAnchor(comments: Comment[]): Comment[] {
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

export default function CommentPicker({
  comments,
  selectedComments,
  onSelectionChange,
  showId = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: CommentPickerProps) {
  const [commentColors, setCommentColors] = useState<Record<string, string>>({});
  const [commentSizes, setCommentSizes] = useState<Record<string, number>>({});
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [lastHoveredCommentId, setLastHoveredCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [draggedCommentId, setDraggedCommentId] = useState<string | null>(null);
  const [dragOverCommentId, setDragOverCommentId] = useState<string | null>(null);
  // 選択済みコメントの位置を全コメント中のインデックスで管理
  const [commentPositions, setCommentPositions] = useState<Record<string, number>>({});

  // クライアントサイドでのみ実行
  useEffect(() => {
    setMounted(true);
  }, []);

  // コメントが変更されたら位置情報をリセット
  useEffect(() => {
    setCommentPositions({});
  }, [comments]);

  // toggleComment関数を先に定義（useCallbackでメモ化）
  const toggleComment = useCallback((comment: Comment) => {
    const isSelected = selectedComments.some(sc => sc.id === comment.id);

    if (isSelected) {
      onSelectionChange(selectedComments.filter(sc => sc.id !== comment.id));
    } else {
      const color = commentColors[comment.id] || '#000000';
      const body = editedComments[comment.id] || comment.body;
      // サイズマップ変換
      const sizeValue = commentSizes[comment.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      const newComment: CommentWithStyle = { ...comment, body, color, fontSize };
      onSelectionChange([...selectedComments, newComment]);
    }
  }, [selectedComments, onSelectionChange, commentColors, editedComments, commentSizes]);

  // グローバルなスペースキー処理（最後にホバーしたコメントを選択/解除）
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // inputフィールドにフォーカスがある場合は無視
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // スペースキーで最後にホバーしたコメントを選択/解除
      if (e.code === 'Space' && lastHoveredCommentId) {
        e.preventDefault(); // スクロールを防ぐ
        const comment = comments.find(c => c.id === lastHoveredCommentId);
        if (comment) {
          toggleComment(comment);
        }
      }

      // Ctrl+Eキーで最後にホバーしたコメントを編集
      if (e.key && e.key.toLowerCase() === 'e' && e.ctrlKey && lastHoveredCommentId) {
        e.preventDefault();
        setEditingCommentId(lastHoveredCommentId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [lastHoveredCommentId, comments, toggleComment]);

  // カラーパレットの定義
  const colorPalette = [
    '#ef4444', // 赤
    '#3b82f6', // 青
    '#a855f7', // 紫
    '#22c55e', // 緑
    '#a0522d', // 茶色
    '#ec4899', // ピンク
    '#eab308', // 黄色
    '#06b6d4', // シアン
    '#64748b', // グレー
    '#000000', // 黒
  ];


  const updateCommentColor = (commentId: string, color: string) => {
    // 色情報を保存
    setCommentColors(prev => ({ ...prev, [commentId]: color }));

    // 選択済みコメントの色を更新
    const updated = selectedComments.map(c =>
      c.id === commentId ? { ...c, color } : c
    );
    onSelectionChange(updated);
  };

  const updateCommentSize = (commentId: string, size: 'small' | 'medium' | 'large') => {
    const sizeMap = { small: 14, medium: 18, large: 22 };
    const fontSizeValue = sizeMap[size];

    // サイズ情報を保存
    setCommentSizes(prev => ({ ...prev, [commentId]: fontSizeValue }));

    // 選択済みコメントのサイズを更新
    const updated = selectedComments.map(c =>
      c.id === commentId ? { ...c, fontSize: size } : c
    );
    onSelectionChange(updated);
  };

  const updateCommentBody = (commentId: string, newBody: string) => {
    // 編集内容を保存
    setEditedComments(prev => ({ ...prev, [commentId]: newBody }));

    // 選択済みコメントの本文を更新
    const updated = selectedComments.map(c =>
      c.id === commentId ? { ...c, body: newBody } : c
    );
    onSelectionChange(updated);
  };

  const selectAll = () => {
    const allComments = comments.map(c => {
      const sizeValue = commentSizes[c.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      return {
        ...c,
        body: editedComments[c.id] || c.body,
        color: commentColors[c.id] || '#000000',
        fontSize
      };
    });
    onSelectionChange(allComments);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={componentStyles.card.base}>
      <StepHeader
        number={2}
        title="コメントを選択"
        badge={{ text: '必須', variant: 'required' }}
        variant="purple"
      />

      {/* スティッキーヘッダー - キーボードショートカット */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-3 bg-gradient-to-r from-sky-50/95 to-cyan-50/95 backdrop-blur-sm border-b border-sky-200 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-bold text-gray-700">ショートカット:</span>
              <span className="inline-flex items-center text-gray-600">
                <kbd className="bg-white px-1.5 py-0.5 rounded font-bold mr-1 shadow-sm border border-gray-200">Space</kbd>
                選択
              </span>
              <span className="inline-flex items-center text-gray-600">
                <kbd className="bg-white px-1.5 py-0.5 rounded font-bold mr-1 shadow-sm border border-gray-200">Ctrl+E</kbd>
                編集
              </span>
              <span className="inline-flex items-center text-gray-600">
                <kbd className="bg-white px-1.5 py-0.5 rounded font-bold mr-1 shadow-sm border border-gray-200">⌘Z</kbd>
                元に戻す
              </span>
              <span className="inline-flex items-center text-gray-600">
                <kbd className="bg-white px-1.5 py-0.5 rounded font-bold mr-1 shadow-sm border border-gray-200">⌘⇧Z</kbd>
                やり直す
              </span>
              <span className="text-gray-600">1-9,0: 色</span>
              <span className="text-gray-600">Q,W,E: サイズ</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${
                canUndo
                  ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:shadow-md cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title="元に戻す (⌘Z)"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              元に戻す
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${
                canRedo
                  ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:shadow-md cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title="やり直す (⌘⇧Z)"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
              やり直す
            </button>
          </div>
        </div>
        {/* 操作ボタン */}
        <div className="pt-2 border-t border-sky-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlySelected}
                  onChange={(e) => setShowOnlySelected(e.target.checked)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">選択済みのレスのみ表示</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-sky-600">
                {selectedComments.length}件選択 / 全{comments.length}件
              </span>
              <span className="text-gray-400">|</span>
              <button
                onClick={selectAll}
                className="text-sm text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
              >
                全て選択
              </button>
              <button
                onClick={deselectAll}
                className="text-sm text-gray-500 hover:text-gray-600 font-medium cursor-pointer"
              >
                選択解除
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {(() => {
          if (showOnlySelected) {
            // 選択済みのみ表示モード：並び替え順序を保持
            return selectedComments.map(sc => ({
              ...comments.find(c => c.id === sc.id)!,
              body: editedComments[sc.id] || sc.body
            }));
          } else {
            // 全て表示モード：選択済みコメントを配置位置に従って全コメント中に挿入
            const selectedIds = new Set(selectedComments.map(sc => sc.id));
            const result: Array<Comment & { body: string; sortKey: number }> = [];

            // 未選択コメントに元のインデックスを割り当て
            comments.forEach((c, index) => {
              if (!selectedIds.has(c.id)) {
                result.push({
                  ...c,
                  body: editedComments[c.id] || c.body,
                  sortKey: index
                });
              }
            });

            // 選択済みコメントを位置情報に基づいて挿入
            selectedComments.forEach(sc => {
              const comment = comments.find(c => c.id === sc.id);
              if (comment) {
                // commentPositionsに位置が記録されていればそれを使用、なければ元のインデックス
                const originalIndex = comments.findIndex(c => c.id === sc.id);
                const targetPosition = commentPositions[sc.id] !== undefined ? commentPositions[sc.id] : originalIndex;

                result.push({
                  ...comment,
                  body: editedComments[comment.id] || comment.body,
                  sortKey: targetPosition
                });
              }
            });

            // sortKeyでソートして返す
            return result.sort((a, b) => a.sortKey - b.sortKey);
          }
        })().map(comment => {
          const displayComment = {
            ...comment,
            body: editedComments[comment.id] || comment.body
          };
          const isSelected = selectedComments.some(sc => sc.id === comment.id);
          const anchorId = extractAnchor(displayComment.body);
          const isReply = anchorId !== null && comments.some(c => Number(c.res_id) === anchorId);

          // 本文バッジの表示判定
          // 並び替え順序の最初のコメントが本文
          const isFirstSelected = selectedComments.length > 0 && selectedComments[0].id === comment.id;

          return (
            <div
              key={comment.id}
              className={`${
                isReply && !showOnlySelected && !isSelected ? 'ml-8 border-l-2 border-sky-200 pl-4' : ''
              } ${
                dragOverCommentId === comment.id ? 'border-t-2 border-sky-500 pt-2' : ''
              } ${
                draggedCommentId === comment.id ? 'opacity-50' : ''
              } ${
                isFirstSelected ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : ''
              } transition-all`}
              onDragEnd={() => {
                setDraggedCommentId(null);
                setDragOverCommentId(null);
              }}
              onDragOver={(e) => {
                // 本文のコメントにはドロップできない
                if (isSelected && draggedCommentId && draggedCommentId !== comment.id && !isFirstSelected) {
                  e.preventDefault();
                  setDragOverCommentId(comment.id);
                }
              }}
              onDragLeave={() => {
                setDragOverCommentId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                // 本文のコメントにはドロップできない
                if (isSelected && draggedCommentId && draggedCommentId !== comment.id && !isFirstSelected) {
                  const draggedIndex = selectedComments.findIndex(sc => sc.id === draggedCommentId);
                  const dropIndex = selectedComments.findIndex(sc => sc.id === comment.id);

                  if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== 0) {  // 本文（インデックス0）を移動しない
                    // ドロップ先のコメントの位置情報を取得
                    const dropCommentIndex = comments.findIndex(c => c.id === comment.id);

                    // ドラッグしたコメントの位置をドロップ先の位置に設定
                    setCommentPositions(prev => ({
                      ...prev,
                      [draggedCommentId]: dropCommentIndex - 0.1  // ドロップ先の少し前に配置
                    }));

                    const newSelectedComments = [...selectedComments];
                    const [draggedComment] = newSelectedComments.splice(draggedIndex, 1);
                    newSelectedComments.splice(dropIndex, 0, draggedComment);
                    onSelectionChange(newSelectedComments);
                  }
                }
                setDraggedCommentId(null);
                setDragOverCommentId(null);
              }}
            >
              <CommentItem
                comment={displayComment}
                isSelected={isSelected}
                isFirstSelected={isFirstSelected}
                onToggle={() => toggleComment(comment)}
                onColorChange={(color) => updateCommentColor(comment.id, color)}
                onSizeChange={(size) => updateCommentSize(comment.id, size)}
                onCommentEdit={updateCommentBody}
                color={commentColors[comment.id] || selectedComments.find(sc => sc.id === comment.id)?.color || '#000000'}
                fontSize={commentSizes[comment.id] || 18}
                colorPalette={colorPalette}
                showId={showId}
                onHover={setLastHoveredCommentId}
                isEditing={editingCommentId === comment.id}
                onEditingChange={(editing) => setEditingCommentId(editing ? comment.id : null)}
                onDragHandleStart={(e) => {
                  if (isSelected && !isFirstSelected) {
                    setDraggedCommentId(comment.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onExpandImage={setExpandedImage}
                isInSortMode={showOnlySelected}
                onMoveToEnd={() => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  if (currentIndex !== -1) {
                    // 全コメントの最後に配置する位置を設定
                    const lastPosition = comments.length - 1;
                    setCommentPositions(prev => ({
                      ...prev,
                      [comment.id]: lastPosition + 0.5  // 小数を使って最後に配置
                    }));

                    // selectedCommentsから削除して最後に追加
                    const newSelectedComments = [...selectedComments];
                    newSelectedComments.splice(currentIndex, 1);
                    newSelectedComments.push(selectedComments[currentIndex]);

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを最後に移動しました`);
                  }
                }}
                onMoveToTop={() => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  if (currentIndex !== -1 && currentIndex > 0) {
                    // 全コメントの最初に配置する位置を設定
                    setCommentPositions(prev => ({
                      ...prev,
                      [comment.id]: -0.5  // 負の小数を使って最初に配置
                    }));

                    const newSelectedComments = [...selectedComments];
                    const [movedComment] = newSelectedComments.splice(currentIndex, 1);
                    newSelectedComments.unshift(movedComment);

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを最初に移動しました`);
                  }
                }}
                onMoveToPosition={(targetResId) => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  // 全コメントから対象のコメントを探す
                  const targetCommentIndex = comments.findIndex(c => String(c.res_id) === String(targetResId));

                  if (targetCommentIndex === -1) {
                    toast.error(`${targetResId}番のコメントが見つかりません`);
                    return;
                  }

                  if (currentIndex !== -1) {
                    // ターゲットコメントの下に配置するため、targetIndex + 0.5 の位置を設定
                    setCommentPositions(prev => ({
                      ...prev,
                      [comment.id]: targetCommentIndex + 0.5
                    }));

                    const newSelectedComments = [...selectedComments];
                    const [movedComment] = newSelectedComments.splice(currentIndex, 1);

                    // selectedCommentsの中で適切な位置に挿入
                    const selectedTargetIndex = selectedComments.findIndex(sc => String(sc.res_id) === String(targetResId));
                    if (selectedTargetIndex !== -1) {
                      const insertIndex = currentIndex < selectedTargetIndex ? selectedTargetIndex : selectedTargetIndex + 1;
                      newSelectedComments.splice(insertIndex, 0, movedComment);
                    } else {
                      newSelectedComments.push(movedComment);
                    }

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを${targetResId}番の下に移動しました`);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          コメントがありません
        </div>
      )}

      {/* 画像拡大モーダル - Portalでbody直下に配置 */}
      {mounted && expandedImage && createPortal(
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black/90 z-[9999]"
            onClick={() => setExpandedImage(null)}
          />
          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <div className="relative pointer-events-auto max-w-[90vw] max-h-[90vh]">
              {/* 閉じるボタン */}
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                aria-label="閉じる"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* 画像 */}
              <img
                src={expandedImage}
                alt="拡大画像"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}