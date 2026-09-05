import type { CommonObservationPoint, Point2D } from '@/types';

/** 観測点の実際の読み取りピクセル座標 (center + offset) */
export function getReadingPixel(point: CommonObservationPoint): Point2D | null {
  if (!point.point) return null;
  return {
    x: point.point.center.x + point.point.offset.x,
    y: point.point.center.y + point.point.offset.y,
  };
}

export function distance2D(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** クリック位置から一定半径内にある観測点を、近い順に返す */
export function findPointsNear(
  points: CommonObservationPoint[],
  pixel: Point2D,
  radiusPx: number,
): CommonObservationPoint[] {
  const candidates: { point: CommonObservationPoint; dist: number }[] = [];
  for (const p of points) {
    const reading = getReadingPixel(p);
    if (!reading) continue;
    const d = distance2D(reading, pixel);
    if (d <= radiusPx) candidates.push({ point: p, dist: d });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.map((c) => c.point);
}

/** キャンバス座標 (画面上のマウス位置) を、パン/ズームを考慮して
 * 画像ピクセル座標に変換する */
export function screenToImagePixel(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number,
): Point2D {
  const localX = screenX - canvasRect.left;
  const localY = screenY - canvasRect.top;
  return {
    x: (localX - panX) / zoom,
    y: (localY - panY) / zoom,
  };
}

/** 画像ピクセル座標を、パン/ズームを考慮してキャンバス上の座標に変換する */
export function imagePixelToScreen(
  pixel: Point2D,
  panX: number,
  panY: number,
  zoom: number,
): Point2D {
  return {
    x: pixel.x * zoom + panX,
    y: pixel.y * zoom + panY,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const MIN_ZOOM = 1.0;
export const MAX_ZOOM = 10.0;

/** 3x3 範囲のピクセル座標一覧を返す (観測点の読み取り範囲) */
export function get3x3Range(center: Point2D): Point2D[] {
  const result: Point2D[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      result.push({ x: Math.round(center.x) + dx, y: Math.round(center.y) + dy });
    }
  }
  return result;
}

/** 緯度経度からおおよその2点間距離 (km) を計算 (簡易球面近似) */
export function haversineDistanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
