/**
 * 強震モニタのリアルタイム震度カラースケール。
 * -3.0 〜 7.0 相当値を色にマッピングする。
 * 参考: 気象庁の震度階級と、強震モニタ画像の配色を近似したもの。
 * 実際の色の厳密な再現が必要な場合は、強震モニタの凡例画像から
 * カラーテーブルを抽出して差し替えてください。
 */

export interface ColorStop {
  value: number;
  color: [number, number, number]; // RGB
}

export const SHINDO_COLOR_STOPS: ColorStop[] = [
  { value: -3.0, color: [0, 0, 0] }, // 無色/データなしに近い扱い
  { value: -1.0, color: [30, 30, 140] },
  { value: 0.0, color: [0, 60, 200] },
  { value: 0.5, color: [0, 130, 220] },
  { value: 1.0, color: [0, 190, 190] },
  { value: 1.5, color: [0, 200, 90] },
  { value: 2.0, color: [140, 220, 0] },
  { value: 2.5, color: [230, 230, 0] },
  { value: 3.0, color: [250, 190, 0] },
  { value: 3.5, color: [250, 140, 0] },
  { value: 4.0, color: [250, 80, 0] },
  { value: 4.5, color: [230, 0, 0] },
  { value: 5.0, color: [190, 0, 40] },
  { value: 5.5, color: [160, 0, 90] },
  { value: 6.0, color: [130, 0, 130] },
  { value: 6.5, color: [110, 0, 160] },
  { value: 7.0, color: [90, 0, 190] },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 震度相当値 (-3.0〜7.0) から RGB 色を取得 */
export function shindoValueToColor(value: number): [number, number, number] {
  const stops = SHINDO_COLOR_STOPS;
  if (value <= stops[0].value) return stops[0].color;
  if (value >= stops[stops.length - 1].value) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (value >= a.value && value <= b.value) {
      const t = (value - a.value) / (b.value - a.value);
      return [
        Math.round(lerp(a.color[0], b.color[0], t)),
        Math.round(lerp(a.color[1], b.color[1], t)),
        Math.round(lerp(a.color[2], b.color[2], t)),
      ];
    }
  }
  return stops[stops.length - 1].color;
}

/** RGB から最も近い震度相当値を逆引きする (デバッグ・検証用) */
export function colorToShindoValue(rgb: [number, number, number]): number {
  let bestValue = SHINDO_COLOR_STOPS[0].value;
  let bestDist = Infinity;
  // 0.1 刻みで探索
  for (let v = -3.0; v <= 7.0; v += 0.1) {
    const c = shindoValueToColor(v);
    const d =
      (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestValue = v;
    }
  }
  return Math.round(bestValue * 10) / 10;
}

export function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** 観測点の種別マーカー色 (仕様書 2.2.2) */
export const TYPE_MARKER_COLOR: Record<string, string> = {
  k_net: '#ff8c00', // オレンジ
  kik_net: '#e02020', // 赤
  s_net: '#2060e0', // 青
  suspended: '#909090', // 運用停止 灰色
};
