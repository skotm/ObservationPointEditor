import type { CommonObservationPoint, ImportResult, NiedSourceFile, ObservationPointType } from '@/types';
import { hasDuplicateCode } from '@/services/observationPointService';

/**
 * NIED 公開の観測点一覧CSV (sitepub_knet_sj.csv / sitepub_kik_sj.csv / sitepub_snet_sj.csv) を
 * パースする。
 *
 * 注意: これらのCSVはNIEDによって時折フォーマットが更新されるため、
 * 列名のゆらぎを吸収できるよう、ヘッダーを見て列位置を自動判定する方式にしている。
 * 想定される列名 (英語/日本語の代表例):
 *   コード:   "Station Code" / "観測点コード" / "code"
 *   観測点名: "Station Name" / "観測点名" / "name"
 *   緯度:     "Latitude"  / "緯度" / "lat"
 *   経度:     "Longitude" / "経度" / "lon" / "lng"
 *   地域:     "Prefecture" / "都道府県" / "所在地"
 * 実データで列が異なる場合は COLUMN_ALIASES を調整してください。
 */

const COLUMN_ALIASES: Record<string, string[]> = {
  code: ['code', 'station code', '観測点コード', 'コード'],
  name: ['name', 'station name', '観測点名', '地点名'],
  latitude: ['latitude', 'lat', '緯度'],
  longitude: ['longitude', 'lon', 'lng', '経度'],
  region: ['prefecture', 'region', '都道府県', '所在地'],
  subRegion: ['sub_region', 'city', '市区町村'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/["\uFEFF]/g, '');
}

function buildColumnIndex(headerRow: string[]): Partial<Record<keyof typeof COLUMN_ALIASES, number>> {
  const normalized = headerRow.map(normalizeHeader);
  const result: Partial<Record<string, number>> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.some((a) => h === a.toLowerCase()));
    if (idx >= 0) result[key] = idx;
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  // 簡易CSVパーサ (ダブルクォート対応)
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function typeForSourceFile(file: NiedSourceFile): ObservationPointType {
  if (file === 'sitepub_kik_sj.csv') return 'kik_net';
  if (file === 'sitepub_knet_sj.csv') return 'k_net';
  return 's_net';
}

export function parseNiedCsv(
  csvText: string,
  sourceFile: NiedSourceFile,
): { points: CommonObservationPoint[]; errorLines: number[] } {
  const lines = csvText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { points: [], errorLines: [] };

  const header = parseCsvLine(lines[0]);
  const colIdx = buildColumnIndex(header);
  const type = typeForSourceFile(sourceFile);

  const points: CommonObservationPoint[] = [];
  const errorLines: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    try {
      const codeIdx = colIdx.code;
      const latIdx = colIdx.latitude;
      const lonIdx = colIdx.longitude;
      if (codeIdx === undefined || latIdx === undefined || lonIdx === undefined) {
        throw new Error('必須列 (code/latitude/longitude) が見つかりません');
      }
      const code = cells[codeIdx]?.trim();
      const lat = Number(cells[latIdx]);
      const lon = Number(cells[lonIdx]);
      if (!code || Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('必須項目が空または数値として不正です');
      }
      points.push({
        type,
        code,
        name: colIdx.name !== undefined ? (cells[colIdx.name]?.trim() ?? '') : code,
        region: colIdx.region !== undefined ? (cells[colIdx.region]?.trim() ?? '') : '',
        subRegion: colIdx.subRegion !== undefined ? cells[colIdx.subRegion]?.trim() : undefined,
        location: { latitude: lat, longitude: lon },
        point: undefined,
        isSuspended: false,
      });
    } catch {
      errorLines.push(i + 1);
    }
  }

  return { points, errorLines };
}

/** 重複チェック(既存コードとの比較)を行いつつ、追加/更新を判定してマージする (仕様書 2.4.3) */
export function mergeImportedPoints(
  existing: CommonObservationPoint[],
  imported: CommonObservationPoint[],
  errorLines: number[],
): { points: CommonObservationPoint[]; result: ImportResult } {
  let addedCount = 0;
  let updatedCount = 0;
  const skippedCount = 0;

  const byCode = new Map(existing.map((p) => [p.code, p]));

  for (const imp of imported) {
    const current = byCode.get(imp.code);
    if (current) {
      // 既存の point (ピクセル座標) は保持しつつ、地理情報等を更新
      byCode.set(imp.code, { ...current, ...imp, point: current.point ?? imp.point });
      updatedCount++;
    } else {
      byCode.set(imp.code, imp);
      addedCount++;
    }
  }

  return {
    points: Array.from(byCode.values()),
    result: { addedCount, updatedCount, skippedCount, errorLines },
  };
}

export function hasCodeConflict(existing: CommonObservationPoint[], code: string): boolean {
  return hasDuplicateCode(existing, code);
}
