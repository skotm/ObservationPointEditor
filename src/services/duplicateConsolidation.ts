import type { CommonObservationPoint, ConsolidationDetail, ConsolidationResult } from '@/types';

/**
 * 観測点コードが同じデータを検出し、優先度順に統合する (仕様書 2.5.1)
 * 優先度:
 *   1. 強震モニタ座標 (point) の有無 → ある方を優先
 *   2. 運用中/中止 → 運用中を優先
 *   3. 地理座標 (location) の有無 (両方揃っていれば best を維持)
 *   4. 名前の有無
 */
function pickBetter(a: CommonObservationPoint, b: CommonObservationPoint): CommonObservationPoint {
  // 1. point の有無
  if (!!a.point !== !!b.point) {
    return a.point ? a : b;
  }
  // 2. 運用中/中止
  if (a.isSuspended !== b.isSuspended) {
    return a.isSuspended ? b : a;
  }
  // 3. location の有無 (常に必須項目だが、0,0 のような未設定値を簡易チェック)
  const aHasLocation = a.location.latitude !== 0 || a.location.longitude !== 0;
  const bHasLocation = b.location.latitude !== 0 || b.location.longitude !== 0;
  if (aHasLocation !== bHasLocation) {
    return aHasLocation ? a : b;
  }
  // 4. 名前の有無
  const aHasName = !!a.name && a.name !== '新規観測点';
  const bHasName = !!b.name && b.name !== '新規観測点';
  if (aHasName !== bHasName) {
    return aHasName ? a : b;
  }
  // どちらも同等なら a を残しつつ、b が持つ情報で欠けている部分を補完
  return {
    ...b,
    ...a,
    point: a.point ?? b.point,
    subRegion: a.subRegion ?? b.subRegion,
  };
}

export function consolidateDuplicates(points: CommonObservationPoint[]): {
  points: CommonObservationPoint[];
  result: ConsolidationResult;
} {
  const groups = new Map<string, CommonObservationPoint[]>();
  for (const p of points) {
    const arr = groups.get(p.code) ?? [];
    arr.push(p);
    groups.set(p.code, arr);
  }

  const resultPoints: CommonObservationPoint[] = [];
  const details: ConsolidationDetail[] = [];
  let removedCount = 0;
  let groupCount = 0;

  for (const [code, group] of groups) {
    if (group.length === 1) {
      resultPoints.push(group[0]);
      continue;
    }
    groupCount++;
    removedCount += group.length - 1;
    const merged = group.reduce((best, cur) => pickBetter(best, cur));
    resultPoints.push(merged);
    details.push({ code, before: group, after: merged });
  }

  return {
    points: resultPoints,
    result: { groupCount, removedCount, details },
  };
}
