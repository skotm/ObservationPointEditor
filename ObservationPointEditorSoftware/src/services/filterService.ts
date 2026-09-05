import type { CommonObservationPoint, FilterState, FilteredData, TypeStats } from '@/types';
import { searchPoints } from '@/services/observationPointService';

/** 複合フィルタリング (AND条件) を適用する (仕様書 2.1.2) */
export function applyFilter(
  points: CommonObservationPoint[],
  filter: FilterState,
): FilteredData {
  let result = points;

  if (filter.searchText.trim()) {
    result = searchPoints(result, filter.searchText);
  }

  result = result.filter((p) => {
    if (!filter.showSuspended && p.isSuspended) return false;
    if (p.type === 'k_net' && !filter.showKNet) return false;
    if (p.type === 'kik_net' && !filter.showKiKNet) return false;
    if (p.type === 's_net' && !filter.showSNet) return false;
    return true;
  });

  return {
    totalCount: points.length,
    filteredCount: result.length,
    points: result,
  };
}

/** 種別別の統計情報 (仕様書 2.1.3) */
export function computeTypeStats(points: CommonObservationPoint[]): TypeStats {
  return points.reduce<TypeStats>(
    (acc, p) => {
      if (p.type === 'k_net') acc.kNet++;
      if (p.type === 'kik_net') acc.kikNet++;
      if (p.type === 's_net') acc.sNet++;
      if (p.isSuspended) acc.suspended++;
      return acc;
    },
    { kNet: 0, kikNet: 0, sNet: 0, suspended: 0 },
  );
}
