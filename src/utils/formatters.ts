import type { ObservationPointType } from '@/types';

export const TYPE_LABEL: Record<ObservationPointType, string> = {
  k_net: 'K-NET',
  kik_net: 'KiK-net',
  s_net: 'S-net',
};

export function formatCoordinate(value: number, digits = 5): string {
  return value.toFixed(digits);
}

export function formatPixel(value: number): string {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 + '' : '-';
}

export function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function formatKmoniTimestamp(date: Date): { dir: string; file: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return {
    dir: `${y}${mo}${d}`,
    file: `${y}${mo}${d}${h}${mi}${s}`,
  };
}

/** 自動採番: 既存コードと衝突しない "NEW001" 形式のコードを生成 */
export function generateNewCode(existingCodes: Set<string>): string {
  let n = 1;
  let code: string;
  do {
    code = `NEW${String(n).padStart(3, '0')}`;
    n++;
  } while (existingCodes.has(code));
  return code;
}
