import type { CommonObservationPoint } from '@/types';
import { generateNewCode } from '@/utils/formatters';

/** 東京駅付近をデフォルト位置とする新規観測点を生成 (仕様書 2.1.1) */
export function createNewPoint(existingPoints: CommonObservationPoint[]): CommonObservationPoint {
  const existingCodes = new Set(existingPoints.map((p) => p.code));
  return {
    type: 'k_net',
    code: generateNewCode(existingCodes),
    name: '新規観測点',
    region: '未設定',
    location: { latitude: 35.0, longitude: 139.0 },
    point: undefined,
    isSuspended: false,
  };
}

export function removePoints(
  points: CommonObservationPoint[],
  codesToRemove: Set<string>,
): CommonObservationPoint[] {
  return points.filter((p) => !codesToRemove.has(p.code));
}

export function updatePoint(
  points: CommonObservationPoint[],
  code: string,
  patch: Partial<CommonObservationPoint>,
): CommonObservationPoint[] {
  return points.map((p) => (p.code === code ? { ...p, ...patch } : p));
}

export function findPointByCode(
  points: CommonObservationPoint[],
  code: string,
): CommonObservationPoint | undefined {
  return points.find((p) => p.code === code);
}

/** コード・名前・地域の複合検索 (大文字小文字を区別しない) */
export function searchPoints(
  points: CommonObservationPoint[],
  query: string,
): CommonObservationPoint[] {
  if (!query.trim()) return points;
  const q = query.trim().toLowerCase();
  return points.filter(
    (p) =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.region.toLowerCase().includes(q) ||
      (p.subRegion ?? '').toLowerCase().includes(q),
  );
}

/** 追加済みコードとの重複チェック */
export function hasDuplicateCode(points: CommonObservationPoint[], code: string): boolean {
  return points.some((p) => p.code === code);
}
