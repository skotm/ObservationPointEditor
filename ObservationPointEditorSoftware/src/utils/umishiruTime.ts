/**
 * 海しる (S-net 強震動情報タイル) の取得時刻を計算する。
 *
 * タイルURL:
 *   https://www.msil.go.jp/data/tiles/smoni/tileimage/{time}/{time}/5/28/11.png
 *   https://www.msil.go.jp/data/tiles/smoni/tileimage/{time}/{time}/5/28/12.png
 * {time} は "YYYYMMDDHHMMSS" 形式 (UTC, 秒は常に "00")。
 *
 * ロジック (仕様提供元の図に基づく):
 *   1. 秒削除:   現在時刻(UTC)の秒を切り捨てる (例 06:30:30 → 06:30:00)
 *   2. 秒確認:   元の秒が 49 未満なら、切り捨てた分をさらに1分巻き戻す
 *               (その分のデータがまだサーバーに揃っていないため、
 *                データは分の開始から約45秒後に揃うと想定し、
 *                49秒という閾値で「揃っているか」を判定する)
 *   3. 遅延適用: 追加の遅延分数 (delayMinutes, 既定 0) をさらに引く
 *
 * 例:
 *   06:30:30 (秒=30) → 秒削除 06:30:00 → 秒確認(30<49) 巻き戻し 06:29:00 → 遅延0分 → 06:29:00
 *   06:30:50 (秒=50) → 秒削除 06:30:00 → 秒確認(50<49 は false) → 06:30:00 → 遅延0分 → 06:30:00
 */
export function computeUmishiruTimestamp(now: Date, delayMinutes = 0): string {
  const seconds = now.getUTCSeconds();

  const truncated = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0,
    ),
  );

  if (seconds < 49) {
    truncated.setUTCMinutes(truncated.getUTCMinutes() - 1);
  }
  if (delayMinutes > 0) {
    truncated.setUTCMinutes(truncated.getUTCMinutes() - delayMinutes);
  }

  return formatUmishiruTimestamp(truncated);
}

/** Date (UTC) を "YYYYMMDDHHMMSS" 形式にフォーマットする */
export function formatUmishiruTimestamp(date: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}00`
  );
}

/** "YYYYMMDDHHMMSS" 形式の文字列を UTC の Date に変換する */
export function parseUmishiruTimestamp(ts: string): Date {
  if (!/^\d{14}$/.test(ts)) throw new Error(`不正な時刻形式です: ${ts}`);
  const year = Number(ts.slice(0, 4));
  const month = Number(ts.slice(4, 6)) - 1;
  const day = Number(ts.slice(6, 8));
  const hour = Number(ts.slice(8, 10));
  const minute = Number(ts.slice(10, 12));
  const second = Number(ts.slice(12, 14));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/** 海しるタイルの固定パラメータ (仕様提供元の指定に基づく) */
export const UMISHIRU_TILE_Z = 5;
export const UMISHIRU_TILE_X = 28;
export const UMISHIRU_TILE_Y_TOP = 11;
export const UMISHIRU_TILE_Y_BOTTOM = 12;
