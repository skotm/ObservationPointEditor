import {
  FileOperationError,
  FileOperationException,
  type CommonObservationPoint,
  type CommonObservationPointJson,
  type ObservationPointType,
} from '@/types';

/**
 * 観測点種別の表記ゆれを吸収して正規化する。
 * 大文字小文字・アンダースコア/ハイフン/スペースの有無を問わず判定する。
 * 例: "kiK_net" / "KIK-NET" / "kiknet" / "Kik Net" → すべて "kik_net" と判定
 */
function normalizeObservationPointType(raw: unknown): ObservationPointType | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (cleaned === 'knet') return 'k_net';
  if (cleaned === 'kiknet') return 'kik_net';
  if (cleaned === 'snet') return 's_net';
  return null;
}

function extractCenter(rawPoint: unknown): { x: number; y: number } | null {
  if (!rawPoint || typeof rawPoint !== 'object') return null;
  // "center" (標準) と "center_point" (外部データでの別名) の両方を許容する
  const center =
    (rawPoint as { center?: { x: number; y: number } }).center ??
    (rawPoint as { center_point?: { x: number; y: number } }).center_point;
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') return null;
  return { x: center.x, y: center.y };
}

function extractOffset(rawPoint: unknown): { x: number; y: number } {
  if (!rawPoint || typeof rawPoint !== 'object') return { x: 0, y: 0 };
  const offset = (rawPoint as { offset?: { x: number; y: number } }).offset;
  if (!offset || typeof offset.x !== 'number' || typeof offset.y !== 'number') return { x: 0, y: 0 };
  return { x: offset.x, y: offset.y };
}

/**
 * 観測点を JSON として出力する。
 *
 * point.raw (読み込み元の元データ) が存在する場合は、それをベースにして
 * 編集済みのフィールドだけを上書きすることで、"center_point" キーや
 * このツールが認識しない追加フィールド (例: japanese_coordinate_system_location)
 * をそのまま維持する。raw が無い (新規追加した観測点) 場合は標準形式で出力する。
 */
export function toJson(point: CommonObservationPoint): Record<string, unknown> {
  const base: Record<string, unknown> = point.raw ? structuredClone(point.raw) : {};

  base.type = point.type;
  base.code = point.code;
  base.name = point.name;
  base.region = point.region;
  if (point.subRegion !== undefined) {
    base.sub_region = point.subRegion;
  } else {
    delete base.sub_region;
  }
  base.location = { latitude: point.location.latitude, longitude: point.location.longitude };
  base.is_suspended = point.isSuspended;

  if (point.point) {
    const existingPointRaw =
      base.point && typeof base.point === 'object' ? (base.point as Record<string, unknown>) : {};
    // 元データが "center_point" キーを使っていた場合はそれを維持し、
    // それ以外 (新規 or 元々 "center" キー) は標準の "center" を使う。
    const usesCenterPointKey = Object.prototype.hasOwnProperty.call(existingPointRaw, 'center_point');
    const centerKey = usesCenterPointKey ? 'center_point' : 'center';

    const newPointObj: Record<string, unknown> = {
      ...existingPointRaw,
      [centerKey]: { x: point.point.center.x, y: point.point.center.y },
      offset: { x: point.point.offset.x, y: point.point.offset.y },
    };
    // 両方のキーが混在しないよう、使わない方のキーを削除する
    if (usesCenterPointKey) {
      delete newPointObj.center;
    } else {
      delete newPointObj.center_point;
    }
    base.point = newPointObj;
  } else {
    delete base.point;
  }

  return base;
}

export function fromJson(json: unknown, lineHint?: number): CommonObservationPoint {
  if (!json || typeof json !== 'object') {
    throw new FileOperationException(
      FileOperationError.InvalidFormat,
      `観測点データの形式が不正です${lineHint ? ` (要素 #${lineHint})` : ''}`,
    );
  }
  const rawJson = json as CommonObservationPointJson & Record<string, unknown>;

  const normalizedType = normalizeObservationPointType(rawJson.type);
  if (!normalizedType) {
    throw new FileOperationException(
      FileOperationError.InvalidFormat,
      `不明な観測点種別です: ${String(rawJson.type)}`,
    );
  }
  if (typeof rawJson.code !== 'string' || rawJson.code.length === 0) {
    throw new FileOperationException(FileOperationError.InvalidFormat, 'code が不正です');
  }
  if (
    !rawJson.location ||
    typeof rawJson.location.latitude !== 'number' ||
    typeof rawJson.location.longitude !== 'number'
  ) {
    throw new FileOperationException(FileOperationError.InvalidFormat, `観測点 ${rawJson.code} の緯度経度が不正です`);
  }

  const center = extractCenter(rawJson.point);

  return {
    type: normalizedType,
    code: rawJson.code,
    name: rawJson.name ?? '',
    region: rawJson.region ?? '',
    subRegion: rawJson.sub_region,
    location: {
      latitude: rawJson.location.latitude,
      longitude: rawJson.location.longitude,
    },
    point: center
      ? {
          center,
          offset: extractOffset(rawJson.point),
        }
      : undefined,
    isSuspended: Boolean(rawJson.is_suspended),
    // 元のJSON構造をまるごと保持しておき、保存時にこれをベースに復元する
    raw: structuredClone(rawJson),
  };
}

export interface SavedFileMeta {
  savedAt?: string;
  count: number;
}

export interface SavedFile {
  meta?: SavedFileMeta;
  points: Record<string, unknown>[];
}

/** 観測点配列を JSON テキストにシリアライズする (UTF-8, インデント付き) */
export function serializePoints(points: CommonObservationPoint[], includeTimestamp: boolean): string {
  const payload: SavedFile = {
    meta: includeTimestamp
      ? { savedAt: new Date().toISOString(), count: points.length }
      : { count: points.length },
    points: points.map(toJson),
  };
  return JSON.stringify(payload, null, 2);
}

/** JSON テキストを観測点配列にデシリアライズする。
 * 単純な配列形式 (CommonObservationPoint[]) と、
 * { meta, points } 形式の両方を受け付ける。 */
export function deserializePoints(text: string): CommonObservationPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new FileOperationException(
      FileOperationError.ParseError,
      `JSON の解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const rawPoints: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as SavedFile)?.points)
      ? (parsed as SavedFile).points
      : (() => {
          throw new FileOperationException(
            FileOperationError.InvalidFormat,
            'ファイルの形式が想定と異なります (観測点配列が見つかりません)',
          );
        })();

  return rawPoints.map((p, i) => fromJson(p, i + 1));
}
