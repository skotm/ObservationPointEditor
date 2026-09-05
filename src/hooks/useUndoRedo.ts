import { useCallback, useRef, useState } from 'react';
import type { CommonObservationPoint, ObservationPointChange } from '@/types';
import { MAX_UNDO_STACK_SIZE } from '@/types';

/**
 * ピクセル座標編集の Undo/Redo を管理するフック (仕様書 2.3.3)
 * 最大 MAX_UNDO_STACK_SIZE 件まで保持する。
 */
export function useUndoRedo(
  points: CommonObservationPoint[],
  setPoints: (updater: (prev: CommonObservationPoint[]) => CommonObservationPoint[]) => void,
) {
  const undoStack = useRef<ObservationPointChange[]>([]);
  const redoStack = useRef<ObservationPointChange[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const pushChange = useCallback(
    (change: ObservationPointChange) => {
      undoStack.current.push(change);
      if (undoStack.current.length > MAX_UNDO_STACK_SIZE) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      syncFlags();
    },
    [syncFlags],
  );

  /** 観測点のピクセル座標変更を記録しつつ適用する */
  const applyPointChange = useCallback(
    (code: string, newPoint: CommonObservationPoint['point']) => {
      const current = points.find((p) => p.code === code);
      if (!current) return;
      const change: ObservationPointChange = {
        code,
        oldPoint: current.point ?? null,
        newPoint: newPoint ?? null,
      };
      setPoints((prev) => prev.map((p) => (p.code === code ? { ...p, point: newPoint } : p)));
      pushChange(change);
    },
    [points, setPoints, pushChange],
  );

  const undo = useCallback(() => {
    const change = undoStack.current.pop();
    if (!change) return;
    setPoints((prev) =>
      prev.map((p) => (p.code === change.code ? { ...p, point: change.oldPoint ?? undefined } : p)),
    );
    redoStack.current.push(change);
    syncFlags();
  }, [setPoints, syncFlags]);

  const redo = useCallback(() => {
    const change = redoStack.current.pop();
    if (!change) return;
    setPoints((prev) =>
      prev.map((p) => (p.code === change.code ? { ...p, point: change.newPoint ?? undefined } : p)),
    );
    undoStack.current.push(change);
    syncFlags();
  }, [setPoints, syncFlags]);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    syncFlags();
  }, [syncFlags]);

  return { applyPointChange, undo, redo, canUndo, canRedo, clearHistory };
}
