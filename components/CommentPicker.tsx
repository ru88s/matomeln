'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Comment, CommentWithStyle } from '@/lib/types';
import toast from 'react-hot-toast';
import { LinkCard } from '@/components/LinkCard';

interface CommentPickerProps {
  comments: Comment[];
  selectedComments: CommentWithStyle[];
  onSelectionChange: (comments: CommentWithStyle[]) => void;
  showId?: boolean;
  customName?: string;
  customNameBold?: boolean;
  customNameColor?: string;
  showOnlySelected?: boolean;
  commentSizes?: Record<string, number>;
  onCommentSizesChange?: (sizes: Record<string, number>) => void;
}

function CommentItem({ comment, isSelected, onToggle, onColorChange, onCommentEdit, onSizeChange, color, fontSize, colorPalette, showId, onHover, isEditing, onEditingChange, onExpandImage, isFirstSelected, isInSortMode, onMoveToEnd, onMoveToTop, onMoveUp, onMoveDown, onMoveToPosition, onDragHandleStart, displayName, displayNameBold, displayNameColor, firstPosterId }: {
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToPosition?: (targetResId: string) => void;
  onDragHandleStart?: (e: React.DragEvent) => void;
  displayName?: string;
  displayNameBold?: boolean;
  displayNameColor?: string;
  firstPosterId?: string;
}) {

  const [isHovered, setIsHovered] = useState(false);
  const [editingBody, setEditingBody] = useState(comment.body);
  const [targetPosition, setTargetPosition] = useState<string>('');  // 移動先番号入力用
  const [showMoveMenu, setShowMoveMenu] = useState(false);  // 移動メニュー表示

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

  // 移動メニューを外側クリックで閉じる
  useEffect(() => {
    if (!showMoveMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // メニュー内のクリックは無視
      if (target.closest('[data-move-menu]')) {
        return;
      }
      setShowMoveMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoveMenu]);

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
      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
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
      className={`relative border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected ? 'bg-orange-50 border-orange-300 shadow-sm' : 'bg-white border-gray-200 hover:border-orange-200 hover:shadow-sm'
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
          <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full font-bold">Space: 選択</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-5 w-5 text-orange-500 focus:ring-orange-400 border-gray-300 rounded cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 pr-10 relative">
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-500">{comment.res_id}.</span>
              <span
                className="text-sm"
                style={{
                  color: displayName ? (displayNameColor || '#ff69b4') : '#4b5563',
                  fontWeight: displayName && displayNameBold ? 'bold' : 'normal'
                }}
              >
                {displayName || comment.name}
              </span>
              <span className="text-sm text-gray-400">{formatDate(comment.created_at)}</span>
              {showId && comment.name_id && (
                <span className={`text-sm ${comment.name_id === firstPosterId ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  ID: {comment.name_id}
                </span>
              )}
            </div>
            {/* 本文バッジ */}
            {isFirstSelected && (
              <div className="absolute top-0 right-0 flex items-center gap-2">
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
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
            {/* 移動メニュー */}
            {!isFirstSelected && (
              <div className="absolute top-0 right-0 flex items-center gap-1" data-move-menu>
                {/* ドラッグハンドル */}
                {isSelected && (
                  <div
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                    draggable={true}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', comment.id);
                      e.dataTransfer.effectAllowed = 'move';
                      onDragHandleStart?.(e);
                    }}
                    title="ドラッグして並べ替え"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveMenu(!showMoveMenu);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                >
                  移動
                  <svg className={`w-3 h-3 transition-transform ${showMoveMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMoveMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp?.();
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      1つ上へ
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown?.();
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      1つ下へ
                    </button>
                    <div className="border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToTop?.();
                          setShowMoveMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>
                        本文の下へ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToEnd?.();
                          setShowMoveMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7M19 5l-7 7-7-7" />
                        </svg>
                        最後へ
                      </button>
                    </div>
                    <div className="border-t border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={targetPosition}
                          onChange={(e) => {
                            e.stopPropagation();
                            setTargetPosition(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              const targetResId = parseInt(targetPosition);
                              if (!isNaN(targetResId) && targetResId > 0) {
                                onMoveToPosition?.(targetPosition);
                                setTargetPosition('');
                                setShowMoveMenu(false);
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="番号"
                          min="1"
                        />
                        <span className="text-xs text-gray-500">の下へ</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetResId = parseInt(targetPosition);
                            if (!isNaN(targetResId) && targetResId > 0) {
                              onMoveToPosition?.(targetPosition);
                              setTargetPosition('');
                              setShowMoveMenu(false);
                            }
                          }}
                          disabled={!targetPosition || isNaN(parseInt(targetPosition))}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          移動
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* カラーパレット - 名前欗の下に表示 */}
          <div className="flex gap-1 flex-wrap mb-3 select-none">
            {colorPalette.map((paletteColor, index) => {
              const keyHint = index === 9 ? '0' : (index + 1).toString();
              return (
                <button
                  key={paletteColor}
                  className={`relative w-6 h-6 md:w-6 md:h-6 min-w-[28px] min-h-[28px] rounded border-2 transition-all hover:scale-110 cursor-pointer ${
                    color === paletteColor ? 'border-orange-400 shadow-md' : 'border-gray-300'
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
              className={`relative px-3 py-1 min-h-[32px] text-xs rounded border transition-all cursor-pointer ${
                fontSize === 22 ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
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
              className={`relative px-3 py-1 min-h-[32px] text-xs rounded border transition-all cursor-pointer ${
                fontSize === 18 ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
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
              className={`relative px-3 py-1 min-h-[32px] text-xs rounded border transition-all cursor-pointer ${
                fontSize === 14 ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
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
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleBodyEdit();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onEditingChange?.(false);
                      setEditingBody(comment.body);
                    }
                  }}
                  className="w-full p-2 border border-orange-300 rounded-lg font-bold resize-none bg-white"
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
                    キャンセル (Esc)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBodyEdit();
                    }}
                    className="px-3 py-1 bg-orange-400 text-white text-sm rounded-lg hover:bg-orange-500 transition-colors font-medium"
                  >
                    保存 ({typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+Enter)
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
                  className="absolute top-0 -right-8 p-1 bg-orange-100 hover:bg-orange-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`編集 (キー: ${typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+E)`}
                >
                  <div className="relative">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isHovered && (
                      <span className="absolute -top-1 -right-1 text-[6px] font-bold bg-white rounded-full px-1 flex items-center justify-center shadow-sm">
                        {typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘E' : 'Ctrl+E'}
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
      // すべてのURLをLinkCardで表示（X/Twitter含む）
      elements.push(<LinkCard key={`card-${part}-${index}`} url={part} />);
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
  customName = '',
  customNameBold = true,
  customNameColor = '#ff69b4',
  showOnlySelected = false,
  commentSizes: externalCommentSizes,
  onCommentSizesChange,
}: CommentPickerProps) {
  const [commentColors, setCommentColors] = useState<Record<string, string>>({});
  const [internalCommentSizes, setInternalCommentSizes] = useState<Record<string, number>>({});
  // 外部から渡された場合はそれを使用、なければ内部ステートを使用
  const commentSizes = externalCommentSizes ?? internalCommentSizes;
  const setCommentSizes = onCommentSizesChange ?? setInternalCommentSizes;
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [lastHoveredCommentId, setLastHoveredCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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

      // Cmd+E (Mac) / Ctrl+E (Windows) キーで最後にホバーしたコメントを編集
      if (e.key && e.key.toLowerCase() === 'e' && (e.metaKey || e.ctrlKey) && lastHoveredCommentId) {
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
    setCommentSizes({ ...commentSizes, [commentId]: fontSizeValue });

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

  // スレ主のID
  const firstPosterId = comments[0]?.name_id;

  return (
    <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-pink-400 text-white rounded-xl flex items-center justify-center shadow-md">
          <span className="font-bold text-lg">2</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">コメントを選択</h2>
      </div>

      <div className="space-y-2">
        {(() => {
          if (showOnlySelected) {
            // 選択済みのみ表示モード：並び替え順序を保持
            return selectedComments.map(sc => ({
              ...comments.find(c => c.id === sc.id)!,
              body: editedComments[sc.id] || sc.body
            }));
          } else {
            // 全て表示モード：アンカーがあるコメントはその参照先の直後に配置
            const selectedIds = new Set(selectedComments.map(sc => sc.id));

            // res_idからコメントへのマップを作成
            const resIdToComment = new Map<number, Comment>();
            comments.forEach(c => {
              resIdToComment.set(Number(c.res_id), c);
            });

            // アンカーによる返信関係をマップ化（res_id -> 返信コメントの配列）
            const repliesMap = new Map<number, Comment[]>();
            const commentsWithAnchor = new Set<string>();

            comments.forEach(comment => {
              const body = editedComments[comment.id] || comment.body;
              const anchorId = extractAnchor(body);
              if (anchorId !== null && resIdToComment.has(anchorId)) {
                if (!repliesMap.has(anchorId)) {
                  repliesMap.set(anchorId, []);
                }
                repliesMap.get(anchorId)!.push(comment);
                commentsWithAnchor.add(comment.id);
              }
            });

            // 結果配列を構築（親コメントの後に返信を挿入）
            const result: Array<Comment & { body: string; sortKey: number }> = [];
            let sortIndex = 0;

            comments.forEach((c) => {
              // アンカーを持つコメントは親の後に挿入されるのでスキップ
              if (commentsWithAnchor.has(c.id)) {
                return;
              }

              // commentPositionsに位置が記録されていればそれを使用
              const targetPosition = commentPositions[c.id] !== undefined
                ? commentPositions[c.id]
                : sortIndex;

              result.push({
                ...c,
                body: editedComments[c.id] || c.body,
                sortKey: targetPosition
              });
              sortIndex++;

              // このコメントへの返信を追加
              const replies = repliesMap.get(Number(c.res_id));
              if (replies) {
                // 返信をres_id順でソート
                replies.sort((a, b) => Number(a.res_id) - Number(b.res_id));
                replies.forEach(reply => {
                  const replyPosition = commentPositions[reply.id] !== undefined
                    ? commentPositions[reply.id]
                    : sortIndex;
                  result.push({
                    ...reply,
                    body: editedComments[reply.id] || reply.body,
                    sortKey: replyPosition
                  });
                  sortIndex++;
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
                isReply && !showOnlySelected ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''
              } ${
                dragOverCommentId === comment.id ? 'border-t-2 border-orange-400 pt-2' : ''
              } ${
                draggedCommentId === comment.id ? 'opacity-50' : ''
              } ${
                isFirstSelected ? 'bg-gray-50 border-gray-200' : ''
              } transition-all`}
              onDragEnd={() => {
                setDraggedCommentId(null);
                setDragOverCommentId(null);
              }}
              onDragOver={(e) => {
                // 本文のコメントにはドロップできない
                if (draggedCommentId && draggedCommentId !== comment.id && !isFirstSelected) {
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
                if (draggedCommentId && draggedCommentId !== comment.id && !isFirstSelected) {
                  if (!isSelected) {
                    // ドロップ先が未選択の場合、commentPositionsを使って位置を設定
                    const targetIndex = comments.findIndex(c => c.id === comment.id);
                    setCommentPositions(prev => ({
                      ...prev,
                      [draggedCommentId]: targetIndex + 0.5
                    }));
                    toast.success(`コメントを移動しました`);
                  } else {
                    // ドロップ先が選択済みの場合、通常の並び替え
                    const draggedIndex = selectedComments.findIndex(sc => sc.id === draggedCommentId);
                    const dropIndex = selectedComments.findIndex(sc => sc.id === comment.id);

                    if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== 0) {  // 本文（インデックス0）を移動しない
                      // selectedCommentsの順序を更新
                      const newSelectedComments = [...selectedComments];
                      const [draggedComment] = newSelectedComments.splice(draggedIndex, 1);
                      newSelectedComments.splice(dropIndex, 0, draggedComment);

                      // 位置情報を完全に再計算
                      const newPositions: Record<string, number> = {};
                      newSelectedComments.forEach((sc, index) => {
                        if (index > 0) { // 本文以外
                          newPositions[sc.id] = index;
                        }
                      });
                      setCommentPositions(newPositions);

                      onSelectionChange(newSelectedComments);
                    }
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
                displayName={customName}
                displayNameBold={customNameBold}
                displayNameColor={customNameColor}
                firstPosterId={firstPosterId}
                onDragHandleStart={(e) => {
                  if (!isFirstSelected) {
                    // 未選択の場合は自動選択
                    if (!isSelected) {
                      toggleComment(comment);
                    }
                    setDraggedCommentId(comment.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onExpandImage={setExpandedImage}
                isInSortMode={showOnlySelected}
                onMoveToEnd={() => {
                  // 未選択の場合は自動選択
                  if (!isSelected) {
                    toggleComment(comment);
                  }

                  // 現在の最大位置を計算
                  setCommentPositions(prev => {
                    const maxPosition = Math.max(
                      comments.length - 1,
                      ...Object.values(prev)
                    );
                    return {
                      ...prev,
                      [comment.id]: maxPosition + 1
                    };
                  });

                  toast.success(`コメントを最後に移動しました`);
                }}
                onMoveToTop={() => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  if (currentIndex !== -1 && currentIndex > 1) {
                    const newSelectedComments = [...selectedComments];
                    const [movedComment] = newSelectedComments.splice(currentIndex, 1);
                    // 本文（インデックス0）の次（インデックス1）に挿入
                    newSelectedComments.splice(1, 0, movedComment);

                    // 位置情報を完全に再計算
                    const newPositions: Record<string, number> = {};
                    newSelectedComments.forEach((sc, index) => {
                      if (index > 0) { // 本文以外
                        newPositions[sc.id] = index;
                      }
                    });
                    setCommentPositions(newPositions);

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを本文の下に移動しました`);
                  }
                }}
                onMoveUp={() => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  // 本文（インデックス0）とその次（インデックス1）は上に移動できない
                  if (currentIndex > 1) {
                    const newSelectedComments = [...selectedComments];
                    const [movedComment] = newSelectedComments.splice(currentIndex, 1);
                    newSelectedComments.splice(currentIndex - 1, 0, movedComment);

                    // 位置情報を完全に再計算
                    const newPositions: Record<string, number> = {};
                    newSelectedComments.forEach((sc, index) => {
                      if (index > 0) {
                        newPositions[sc.id] = index;
                      }
                    });
                    setCommentPositions(newPositions);

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを1つ上に移動しました`);
                  }
                }}
                onMoveDown={() => {
                  const currentIndex = selectedComments.findIndex(sc => sc.id === comment.id);
                  // 本文（インデックス0）は下に移動できない、最後のコメントも移動不可
                  if (currentIndex > 0 && currentIndex < selectedComments.length - 1) {
                    const newSelectedComments = [...selectedComments];
                    const [movedComment] = newSelectedComments.splice(currentIndex, 1);
                    newSelectedComments.splice(currentIndex + 1, 0, movedComment);

                    // 位置情報を完全に再計算
                    const newPositions: Record<string, number> = {};
                    newSelectedComments.forEach((sc, index) => {
                      if (index > 0) {
                        newPositions[sc.id] = index;
                      }
                    });
                    setCommentPositions(newPositions);

                    onSelectionChange(newSelectedComments);
                    toast.success(`コメントを1つ下に移動しました`);
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="画像拡大表示"
        >
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
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="閉じる"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        </div>,
        document.body
      )}

    </div>
  );
}