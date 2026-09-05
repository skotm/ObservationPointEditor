import type { CommonObservationPoint, TransparentPixelPointResult, UnassignedPixelResult } from '@/types';
import { get3x3Range, getReadingPixel } from '@/utils/geometry';

/**
 * 画像中の「色付きピクセル」のうち、どの観測点の 3x3 範囲にも
 * 属していないものを検出する (仕様書 2.6.1)。
 *
 * @param imageData Canvas から取得した ImageData
 * @param isColoredPixel 背景/海/陸地でない「観測データが乗っている」ピクセルかどうかの判定関数
 * @param maxSamples サンプルとして返す最大件数 (UI表示用に間引く)
 */
export function findUnassignedPixels(
  imageData: ImageData,
  points: CommonObservationPoint[],
  isColoredPixel: (r: number, g: number, b: number, a: number) => boolean,
  maxSamples = 500,
): UnassignedPixelResult {
  const assigned = new Set<string>();
  for (const p of points) {
    const reading = getReadingPixel(p);
    if (!reading) continue;
    for (const px of get3x3Range(reading)) {
      assigned.add(`${px.x},${px.y}`);
    }
  }

  const { width, height, data } = imageData;
  const samples: { x: number; y: number; nearestCode: string | null }[] = [];
  let unassignedCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (!isColoredPixel(r, g, b, a)) continue;
      if (assigned.has(`${x},${y}`)) continue;

      unassignedCount++;
      if (samples.length < maxSamples) {
        samples.push({ x, y, nearestCode: findNearestPointCode(points, x, y) });
      }
    }
  }

  return { unassignedCount, samples };
}

function findNearestPointCode(
  points: CommonObservationPoint[],
  x: number,
  y: number,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    const reading = getReadingPixel(p);
    if (!reading) continue;
    const d = (reading.x - x) ** 2 + (reading.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p.code;
    }
  }
  return best;
}

/**
 * 各観測点の読み取り位置 (3x3範囲) が透明/データなしピクセルばかりになっていないか検査する
 * (仕様書 2.6.2) - 観測点位置がずれている可能性の検出に使う。
 */
export function findTransparentPixelPoints(
  imageData: ImageData,
  points: CommonObservationPoint[],
  isTransparent: (r: number, g: number, b: number, a: number) => boolean,
): TransparentPixelPointResult[] {
  const { width, height, data } = imageData;
  const results: TransparentPixelPointResult[] = [];

  for (const p of points) {
    const reading = getReadingPixel(p);
    if (!reading) continue;
    let transparentCount = 0;
    let total = 0;
    for (const px of get3x3Range(reading)) {
      if (px.x < 0 || px.y < 0 || px.x >= width || px.y >= height) continue;
      total++;
      const idx = (px.y * width + px.x) * 4;
      if (isTransparent(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        transparentCount++;
      }
    }
    if (total > 0 && transparentCount === total) {
      results.push({ code: p.code, name: p.name, transparentCount });
    }
  }

  return results;
}
