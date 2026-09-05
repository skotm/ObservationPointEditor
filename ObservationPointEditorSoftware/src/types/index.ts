// ============================================================
// 共通型定義 (仕様書 4章 対応)
// ============================================================

export type ObservationPointType = 'k_net' | 'kik_net' | 's_net';

/** 強震モニタで表示される画像の種別 */
export type KmoniImageKind = 'shindo' | 'accel';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/** ピクセル座標系での読み取り位置。center が観測点の基準座標、
 * offset は強震モニタ画像上で実際に色を読み取る位置への補正値。 */
export interface KyoshinImagePoint {
  center: Point2D;
  offset: Point2D;
}

export interface CommonObservationPoint {
  type: ObservationPointType;
  code: string;
  name: string;
  region: string;
  subRegion?: string;
  location: Location;
  point?: KyoshinImagePoint;
  isSuspended: boolean;
}

/** JSON シリアライズ時 (snake_case) の形 */
export interface CommonObservationPointJson {
  type: ObservationPointType;
  code: string;
  name: string;
  region: string;
  sub_region?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  point?: {
    center: { x: number; y: number };
    offset: { x: number; y: number };
  };
  is_suspended: boolean;
}

// ------------------------------------------------------------
// Undo / Redo
// ------------------------------------------------------------

export interface ObservationPointChange {
  /** 変更対象の観測点コード (点そのものへの参照ではなくコードで持つ) */
  code: string;
  oldPoint: KyoshinImagePoint | null;
  newPoint: KyoshinImagePoint | null;
}

export const MAX_UNDO_STACK_SIZE = 50;

// ------------------------------------------------------------
// フィルター
// ------------------------------------------------------------

export interface FilterState {
  searchText: string;
  showKNet: boolean;
  showKiKNet: boolean;
  showSNet: boolean;
  showSuspended: boolean;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  searchText: '',
  showKNet: true,
  showKiKNet: true,
  showSNet: true,
  showSuspended: true,
};

export interface FilteredData {
  totalCount: number;
  filteredCount: number;
  points: CommonObservationPoint[];
}

export interface TypeStats {
  kNet: number;
  kikNet: number;
  sNet: number;
  suspended: number;
}

// ------------------------------------------------------------
// ファイル入出力関連
// ------------------------------------------------------------

export enum FileOperationError {
  FileNotFound = 'FILE_NOT_FOUND',
  InvalidFormat = 'INVALID_FORMAT',
  ParseError = 'PARSE_ERROR',
  SaveFailed = 'SAVE_FAILED',
  PermissionDenied = 'PERMISSION_DENIED',
}

export class FileOperationException extends Error {
  constructor(
    public code: FileOperationError,
    message: string,
  ) {
    super(message);
    this.name = 'FileOperationException';
  }
}

export interface KmopHeader {
  version: number;
  packedAt: string;
  source: string;
  dataVersion: string;
}

// ------------------------------------------------------------
// インポート (NIED CSV)
// ------------------------------------------------------------

export type NiedSourceFile =
  | 'sitepub_kik_sj.csv'
  | 'sitepub_knet_sj.csv'
  | 'sitepub_snet_sj.csv';

export interface ImportResult {
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorLines: number[];
}

// ------------------------------------------------------------
// 重複統合
// ------------------------------------------------------------

export interface ConsolidationDetail {
  code: string;
  before: CommonObservationPoint[];
  after: CommonObservationPoint;
}

export interface ConsolidationResult {
  groupCount: number;
  removedCount: number;
  details: ConsolidationDetail[];
}

// ------------------------------------------------------------
// ピクセル検出
// ------------------------------------------------------------

export interface UnassignedPixelResult {
  unassignedCount: number;
  /** サンプリングした未割当ピクセル (画像が大きい場合は間引く) */
  samples: { x: number; y: number; nearestCode: string | null }[];
}

export interface TransparentPixelPointResult {
  code: string;
  name: string;
  transparentCount: number;
}

// ------------------------------------------------------------
// イベント (仕様書 6.1 対応、コールバック型として利用)
// ------------------------------------------------------------

export interface DebugInfo {
  mouseGeo: Location | null;
  mousePixel: Point2D | null;
  imageSize: { width: number; height: number } | null;
  selectedPoint: CommonObservationPoint | null;
}
