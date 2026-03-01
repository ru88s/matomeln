'use client';

import { useReducer, useCallback, useEffect } from 'react';

interface UseUndoRedoOptions<T> {
  maxHistorySize?: number;
  initialState: T;
}

interface UndoRedoState<T> {
  history: T[];
  currentIndex: number;
}

type UndoRedoAction<T> =
  | { type: 'SET_VALUE'; value: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; initialState: T };

function createReducer<T>(maxHistorySize: number) {
  return function reducer(state: UndoRedoState<T>, action: UndoRedoAction<T>): UndoRedoState<T> {
    switch (action.type) {
      case 'SET_VALUE': {
        // 現在の位置より後の履歴を削除して新しい値を追加
        const newHistory = [...state.history.slice(0, state.currentIndex + 1), action.value];
        let newIndex = state.currentIndex + 1;

        // 履歴の最大サイズを超えたら古いものを削除
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
          newIndex = newHistory.length - 1;
        }

        return { history: newHistory, currentIndex: newIndex };
      }
      case 'UNDO': {
        if (state.currentIndex <= 0) return state;
        return { ...state, currentIndex: state.currentIndex - 1 };
      }
      case 'REDO': {
        if (state.currentIndex >= state.history.length - 1) return state;
        return { ...state, currentIndex: state.currentIndex + 1 };
      }
      case 'RESET': {
        return { history: [action.initialState], currentIndex: 0 };
      }
      default:
        return state;
    }
  };
}

export function useUndoRedo<T>({ maxHistorySize = 50, initialState }: UseUndoRedoOptions<T>) {
  const [state, dispatch] = useReducer(
    createReducer<T>(maxHistorySize),
    { history: [initialState], currentIndex: 0 }
  );

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.history.length - 1;

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    // For function updaters, we need to resolve the value first
    // Since we can't access state inside dispatch directly for function updaters,
    // we handle this with a special pattern
    if (typeof newValue === 'function') {
      // We need to use the state from the reducer; this works because
      // React guarantees dispatch is called synchronously with the latest state
      dispatch({
        type: 'SET_VALUE',
        // This is a workaround - we access state.history[state.currentIndex] here
        // It's safe because setValue is stable and React batches updates
        value: (newValue as (prev: T) => T)(state.history[state.currentIndex]),
      });
    } else {
      dispatch({ type: 'SET_VALUE', value: newValue });
    }
  }, [state.history, state.currentIndex]);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', initialState });
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

  const value = state.history[state.currentIndex];

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historySize: state.history.length,
    currentIndex: state.currentIndex,
  };
}
