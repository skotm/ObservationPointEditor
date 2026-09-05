import { useCallback, useMemo, useState } from 'react';
import type { CommonObservationPoint, FilterState } from '@/types';
import { DEFAULT_FILTER_STATE } from '@/types';
import { applyFilter, computeTypeStats } from '@/services/filterService';
import { createNewPoint, removePoints, updatePoint } from '@/services/observationPointService';
import { useUndoRedo } from '@/hooks/useUndoRedo';

export function useObservationPoints() {
  const [points, setPoints] = useState<CommonObservationPoint[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isDirty, setIsDirty] = useState(false);

  const setPointsAndMarkDirty = useCallback(
    (updater: (prev: CommonObservationPoint[]) => CommonObservationPoint[]) => {
      setPoints((prev) => updater(prev));
      setIsDirty(true);
    },
    [],
  );

  const { applyPointChange, undo, redo, canUndo, canRedo, clearHistory } = useUndoRedo(
    points,
    setPointsAndMarkDirty,
  );

  const loadPoints = useCallback((loaded: CommonObservationPoint[]) => {
    setPoints(loaded);
    setSelectedCode(null);
    setIsDirty(false);
    clearHistory();
  }, [clearHistory]);

  const addPoint = useCallback(() => {
    const np = createNewPoint(points);
    setPointsAndMarkDirty((prev) => [...prev, np]);
    setSelectedCode(np.code);
  }, [points, setPointsAndMarkDirty]);

  const removeSelected = useCallback(
    (codes: Set<string>) => {
      setPointsAndMarkDirty((prev) => removePoints(prev, codes));
      if (selectedCode && codes.has(selectedCode)) setSelectedCode(null);
    },
    [selectedCode, setPointsAndMarkDirty],
  );

  const patchPoint = useCallback(
    (code: string, patch: Partial<CommonObservationPoint>) => {
      setPointsAndMarkDirty((prev) => updatePoint(prev, code, patch));
    },
    [setPointsAndMarkDirty],
  );

  const replaceAllPoints = useCallback(
    (next: CommonObservationPoint[]) => {
      setPointsAndMarkDirty(() => next);
    },
    [setPointsAndMarkDirty],
  );

  const filteredData = useMemo(() => applyFilter(points, filter), [points, filter]);
  const stats = useMemo(() => computeTypeStats(points), [points]);
  const selectedPoint = useMemo(
    () => points.find((p) => p.code === selectedCode) ?? null,
    [points, selectedCode],
  );

  const markSaved = useCallback(() => setIsDirty(false), []);

  return {
    points,
    filteredData,
    stats,
    filter,
    setFilter,
    selectedPoint,
    selectedCode,
    setSelectedCode,
    isDirty,
    loadPoints,
    addPoint,
    removeSelected,
    patchPoint,
    applyPointChange,
    replaceAllPoints,
    undo,
    redo,
    canUndo,
    canRedo,
    markSaved,
  };
}

export type ObservationPointsStore = ReturnType<typeof useObservationPoints>;
