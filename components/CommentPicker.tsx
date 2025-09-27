'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Comment, CommentWithStyle } from '@/lib/types';
import { StepHeader } from '@/components/ui/StepHeader';
import { componentStyles } from '@/lib/design-system';

interface CommentPickerProps {
  comments: Comment[];
  selectedComments: CommentWithStyle[];
  onSelectionChange: (comments: CommentWithStyle[]) => void;
  showId?: boolean;
}

function CommentItem({ comment, isSelected, onToggle, onColorChange, onCommentEdit, onSizeChange, color, fontSize, colorPalette, showId, onHover, isEditing, onEditingChange, onExpandImage, isFirstSelected }: {
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
}) {

  const [isHovered, setIsHovered] = useState(false);
  const [editingBody, setEditingBody] = useState(comment.body);

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
      if (e.key.toLowerCase() === 'e') {
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
      className={`relative border-2 rounded-2xl p-4 transition-all cursor-pointer ${
        isSelected ? 'bg-gradient-to-r from-sky-50 to-cyan-50 border-sky-300 shadow-md' : 'bg-white/80 border-sky-100 hover:border-sky-200'
      }`}
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
          className="mt-1 h-5 w-5 text-sky-600 focus:ring-sky-500 border-gray-300 rounded cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 select-none pr-10 relative">
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-500">{comment.res_id}.</span>
              <span className="text-sm text-gray-600">{comment.name}</span>
              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
              {showId && comment.name_id && (
                <span className="text-xs text-gray-400">ID: {comment.name_id}</span>
              )}
              {/* 本文バッジを右上に表示 */}
              {isFirstSelected && (
                <span className="absolute top-0 right-0 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded">
                  本文
                </span>
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
          <div className="flex gap-2 mb-3 select-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange('large');
                if (!isSelected) {
                  onToggle();
                }
              }}
              className={`relative px-3 py-1 text-xs rounded border transition-all ${
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
              className={`relative px-3 py-1 text-xs rounded border transition-all ${
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
              className={`relative px-3 py-1 text-xs rounded border transition-all ${
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
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEditingChange?.(true);
                  }}
                >
                  <span style={{ fontSize: `${fontSize || 18}px` }}>
                    {comment.body.length > 150 && !isEditing ?
                      renderBodyWithAnchorsAndLinks(comment.body.substring(0, 150) + '...', color, fontSize) :
                      renderBodyWithAnchorsAndLinks(comment.body, color, fontSize)}
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
  // URLとアンカーのパターンを結合
  const pattern = /(https?:\/\/[^\s]+|>>\d+)/g;
  const parts = body.split(pattern);

  return parts.map((part, index) => {
    // URLの場合
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6', cursor: 'pointer' }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    // アンカーの場合
    else if (/^>>\d+$/.test(part)) {
      return (
        <span key={index} style={{ color: '#3b82f6', cursor: 'pointer' }}>
          {part}
        </span>
      );
    }
    // 通常のテキスト
    else {
      return <span key={index} style={{ color: color || '#000000' }}>{part}</span>;
    }
  });
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
}: CommentPickerProps) {
  const [commentColors, setCommentColors] = useState<Record<string, string>>({});
  const [commentSizes, setCommentSizes] = useState<Record<string, number>>({});
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [lastHoveredCommentId, setLastHoveredCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setMounted(true);
  }, []);

  // toggleComment関数を先に定義（useCallbackでメモ化）
  const toggleComment = useCallback((comment: Comment) => {
    const isSelected = selectedComments.some(sc => sc.id === comment.id);
    if (isSelected) {
      onSelectionChange(selectedComments.filter(sc => sc.id !== comment.id));
    } else {
      const color = commentColors[comment.id] || '#000000';
      const body = editedComments[comment.id] || comment.body;
      const newComment: CommentWithStyle = { ...comment, body, color };
      onSelectionChange([...selectedComments, newComment]);
    }
  }, [selectedComments, onSelectionChange, commentColors, editedComments]);

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
  }, [lastHoveredCommentId, comments, toggleComment, setEditingCommentId]);

  // カラーパレットの定義
  const colorPalette = [
    '#ef4444', // 赤
    '#3b82f6', // 青
    '#a855f7', // 紫
    '#22c55e', // 緑
    '#ec4899', // ピンク
    '#f97316', // オレンジ
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
    const fontSize = sizeMap[size];

    // サイズ情報を保存
    setCommentSizes(prev => ({ ...prev, [commentId]: fontSize }));
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
    const allComments = comments.map(c => ({
      ...c,
      body: editedComments[c.id] || c.body,
      color: commentColors[c.id] || '#000000'
    }));
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

      {/* キーボードショートカットのヒント */}
      <div className="mb-4 p-3 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl border border-sky-200">
        <div className="text-xs font-bold text-gray-700 mb-1">キーボードショートカット:</div>
        <div className="text-xs text-gray-600 space-x-4">
          <span className="inline-flex items-center">
            <span className="bg-white px-1.5 py-0.5 rounded font-bold mr-1">Space</span>
            選択/解除
          </span>
          <span className="inline-flex items-center">
            <span className="bg-white px-1.5 py-0.5 rounded font-bold mr-1">Ctrl+E</span>
            編集
          </span>
          <span className="ml-3">1-9,0: 色選択</span>
          <span className="ml-3">Q,W,E: サイズ（大/中/小）</span>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="mb-4 flex items-center justify-end">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-sky-600 hover:text-sky-700 font-bold"
          >
            全て選択
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-500 hover:text-gray-600 font-medium"
          >
            選択解除
          </button>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-600">
        {selectedComments.length}件選択中 / 全{comments.length}件
      </div>

      <div className="space-y-2">
        {arrangeCommentsByAnchor(comments).map(comment => {
          const displayComment = {
            ...comment,
            body: editedComments[comment.id] || comment.body
          };
          const isSelected = selectedComments.some(sc => sc.id === comment.id);
          const anchorId = extractAnchor(displayComment.body);
          const isReply = anchorId !== null && comments.some(c => Number(c.res_id) === anchorId);

          // 選択されたコメントの中でres_idが最小のものを本文とする
          const minResId = selectedComments.length > 0
            ? Math.min(...selectedComments.map(c => Number(c.res_id)))
            : null;
          const isFirstSelected = selectedComments.length > 0 && Number(comment.res_id) === minResId;

          return (
            <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-sky-200 pl-4' : ''}`}>
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
                onExpandImage={setExpandedImage}
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