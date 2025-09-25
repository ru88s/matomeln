'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Comment } from '@/lib/types';

interface CommentPickerProps {
  comments: Comment[];
  selectedComments: Comment[];
  onSelectionChange: (comments: Comment[]) => void;
}

function SortableComment({ comment, isSelected, onToggle }: {
  comment: Comment;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: comment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl p-4 mb-2 cursor-move ${
        isSelected ? 'bg-pink-50 border-pink-300' : 'bg-white border-gray-200'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">#{comment.res_id}</span>
            <span className="text-sm text-gray-600">{comment.name}</span>
          </div>
          <div className="text-gray-900 whitespace-pre-wrap text-sm">
            {comment.body.length > 150 ?
              `${comment.body.substring(0, 150)}...` :
              comment.body}
          </div>
          {comment.images && comment.images.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              📷 画像 {comment.images.length}枚
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentPicker({
  comments,
  selectedComments,
  onSelectionChange,
}: CommentPickerProps) {
  const [filter, setFilter] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredComments = comments.filter(comment => {
    const matchesFilter = filter === '' ||
      comment.body.toLowerCase().includes(filter.toLowerCase()) ||
      comment.res_id.includes(filter);

    const matchesSelection = !showSelectedOnly ||
      selectedComments.some(sc => sc.id === comment.id);

    return matchesFilter && matchesSelection;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selectedComments.findIndex(c => c.id === active.id);
      const newIndex = selectedComments.findIndex(c => c.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onSelectionChange(arrayMove(selectedComments, oldIndex, newIndex));
      }
    }
  };

  const toggleComment = (comment: Comment) => {
    const isSelected = selectedComments.some(sc => sc.id === comment.id);
    if (isSelected) {
      onSelectionChange(selectedComments.filter(sc => sc.id !== comment.id));
    } else {
      onSelectionChange([...selectedComments, comment]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredComments);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        ステップ2: コメントを選択・並び替え
      </h2>

      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="コメントを検索..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={(e) => setShowSelectedOnly(e.target.checked)}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">選択中のみ表示</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              全て選択
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              選択解除
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-600">
        {selectedComments.length}件選択中 / 全{comments.length}件
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={showSelectedOnly ? selectedComments : filteredComments}
          strategy={verticalListSortingStrategy}
        >
          <div className="max-h-96 overflow-y-auto pr-2">
            {(showSelectedOnly ? selectedComments : filteredComments).map(comment => (
              <SortableComment
                key={comment.id}
                comment={comment}
                isSelected={selectedComments.some(sc => sc.id === comment.id)}
                onToggle={() => toggleComment(comment)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredComments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          コメントが見つかりません
        </div>
      )}
    </div>
  );
}