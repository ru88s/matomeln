'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseUndoRedoOptions<T> {
  maxHistorySize?: number;
  initialState: T;
}

export function useUndoRedo<T>({ maxHistorySize = 50, initialState }: UseUndoRedoOptions<T>) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setHistory((prevHistory) => {
      const currentValue = prevHistory[currentIndex];
      const value = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue;

      // 現在の位置より後の履歴を削除して新しい値を追加
      const newHistory = [...prevHistory.slice(0, currentIndex + 1), value];

      // 履歴の最大サイズを超えたら古いものを削除
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setCurrentIndex((prev) => {
      const newLength = Math.min(history.length + 1, maxHistorySize);
      return Math.min(prev + 1, newLength - 1);
    });
  }, [currentIndex, history.length, maxHistorySize]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  const reset = useCallback(() => {
    setHistory([initialState]);
    setCurrentIndex(0);
  }, [initialState]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (modKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (!isMac && modKey && e.key === 'y') {
        // Windows/LinuxではCtrl+YもRedoとして使える
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const value = history[currentIndex];

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historySize: history.length,
    currentIndex,
  };
}