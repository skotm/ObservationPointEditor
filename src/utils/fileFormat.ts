import {
  FileOperationError,
  FileOperationException,
  type CommonObservationPoint,
  type CommonObservationPointJson,
  type ObservationPointType,
} from '@/types';

const VALID_TYPES: ObservationPointType[] = ['k_net', 'kik_net', 's_net'];

export function toJson(point: CommonObservationPoint): CommonObservationPointJson {
  return {
    type: point.type,
    code: point.code,
    name: point.name,
    region: point.region,
    sub_region: point.subRegion,
    location: {
      latitude: point.location.latitude,
      longitude: point.location.longitude,
    },
    point: point.point
      ? {
          center: { x: point.point.center.x, y: point.point.center.y },
          offset: { x: point.point.offset.x, y: point.point.offset.y },
        }
      : undefined,
    is_suspended: point.isSuspended,
  };
}

export function fromJson(json: CommonObservationPointJson, lineHint?: number): CommonObservationPoint {
  if (!json || typeof json !== 'object') {
    throw new FileOperationException(
      FileOperationError.InvalidFormat,
      `観測点データの形式が不正です${lineHint ? ` (要素 #${lineHint})` : ''}`,
    );
  }
  if (!VALID_TYPES.includes(json.type)) {
    throw new FileOperationException(
      FileOperationError.InvalidFormat,
      `不明な観測点種別です: ${String(json.type)}`,
    );
  }
  if (typeof json.code !== 'string' || json.code.length === 0) {
    throw new FileOperationException(FileOperationError.InvalidFormat, 'code が不正です');
  }
  if (!json.location || typeof json.location.latitude !== 'number' || typeof json.location.longitude !== 'number') {
    throw new FileOperationException(FileOperationError.InvalidFormat, `観測点 ${json.code} の緯度経度が不正です`);
  }

  return {
    type: json.type,
    code: json.code,
    name: json.name ?? '',
    region: json.region ?? '',
    subRegion: json.sub_region,
    location: {
      latitude: json.location.latitude,
      longitude: json.location.longitude,
    },
    point: json.point
      ? {
          center: { x: json.point.center.x, y: json.point.center.y },
          offset: { x: json.point.offset.x, y: json.point.offset.y },
        }
      : undefined,
    isSuspended: Boolean(json.is_suspended),
  };
}

export interface SavedFileMeta {
  savedAt?: string;
  count: number;
}

export interface SavedFile {
  meta?: SavedFileMeta;
  points: CommonObservationPointJson[];
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

  return rawPoints.map((p, i) => fromJson(p as CommonObservationPointJson, i + 1));
}
