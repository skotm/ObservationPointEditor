/**
 * 海しる (S-net 強震動情報タイル) の取得時刻を計算する。
 * ロジックの詳細は ../../src/utils/umishiruTime.ts のコメントを参照。
 * Worker は独立してデプロイされるため、フロントエンドと同じロジックをここに複製している。
 * ロジックを変更する場合は両方のファイルを更新すること。
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

  const pad2 = (n: number) => String(n).padStart(2, '0');
  return (
    `${truncated.getUTCFullYear()}${pad2(truncated.getUTCMonth() + 1)}${pad2(truncated.getUTCDate())}` +
    `${pad2(truncated.getUTCHours())}${pad2(truncated.getUTCMinutes())}00`
  );
}
