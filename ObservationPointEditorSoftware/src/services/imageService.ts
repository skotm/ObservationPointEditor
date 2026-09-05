import type { KmoniImageKind } from '@/types';

/**
 * 画像プロキシ (Cloudflare Worker) のベースURL。
 * 開発時は .env.local に VITE_IMAGE_PROXY_BASE_URL を設定してください。
 * 例: VITE_IMAGE_PROXY_BASE_URL=https://obs-point-image-proxy.your-subdomain.workers.dev
 */
const PROXY_BASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_IMAGE_PROXY_BASE_URL ?? '';

export class ImageFetchError extends Error {}

function ensureProxyConfigured(): void {
  if (!PROXY_BASE_URL) {
    throw new ImageFetchError(
      '画像プロキシのURLが設定されていません。.env.local の VITE_IMAGE_PROXY_BASE_URL を設定してください。',
    );
  }
}

/**
 * 強震モニタ (kmoni) の最新画像時刻を取得する。
 * Worker 側は http://www.kmoni.bosai.go.jp/webservice/server/pros/latest.json をプロキシする。
 */
export async function fetchKmoniLatestTimestamp(): Promise<string> {
  ensureProxyConfigured();
  const res = await fetch(`${PROXY_BASE_URL}/kmoni/latest`);
  if (!res.ok) throw new ImageFetchError(`最新時刻の取得に失敗しました (HTTP ${res.status})`);
  const json = (await res.json()) as { latest_time?: string; latest?: string };
  const latest = json.latest_time ?? json.latest;
  if (!latest) throw new ImageFetchError('最新時刻のレスポンス形式が想定外です');
  return latest;
}

/**
 * 強震モニタの背景画像 (震度分布 or 最大加速度) を取得し、Blob URL を返す。
 * @param timestamp "YYYYMMDDHHMMSS" 形式
 */
export async function fetchKmoniImage(
  timestamp: string,
  kind: KmoniImageKind = 'shindo',
): Promise<string> {
  ensureProxyConfigured();
  const res = await fetch(`${PROXY_BASE_URL}/kmoni/image?timestamp=${timestamp}&kind=${kind}`);
  if (!res.ok) throw new ImageFetchError(`画像の取得に失敗しました (HTTP ${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * 海しる (S-net 強震動情報レイヤー) のタイル取得時刻を取得する。
 * Worker 側で computeUmishiruTimestamp により算出された値を返す。
 */
export async function fetchUmiShiruLatestTime(): Promise<string> {
  ensureProxyConfigured();
  const res = await fetch(`${PROXY_BASE_URL}/umishiru/latest`);
  if (!res.ok) throw new ImageFetchError(`海しる取得時刻の算出に失敗しました (HTTP ${res.status})`);
  const json = (await res.json()) as { time?: string };
  if (!json.time) throw new ImageFetchError('海しる取得時刻のレスポンス形式が想定外です');
  return json.time;
}

/**
 * 海しる (S-net 強震動情報レイヤー) の2枚のタイル画像 (z=5, x=28, y=11/12) を取得し、
 * 縦に結合した1枚の画像として Blob URL を返す。
 * @param time "YYYYMMDDHHMMSS" 形式。省略時は Worker 側で自動計算される。
 */
export async function fetchUmiShiruImage(time?: string): Promise<string> {
  ensureProxyConfigured();
  const buildUrl = (y: number) => {
    const params = new URLSearchParams({ y: String(y) });
    if (time) params.set('time', time);
    return `${PROXY_BASE_URL}/umishiru/tile?${params.toString()}`;
  };

  const [topRes, bottomRes] = await Promise.all([fetch(buildUrl(11)), fetch(buildUrl(12))]);
  if (!topRes.ok || !bottomRes.ok) {
    throw new ImageFetchError(
      `海しるタイルの取得に失敗しました (HTTP ${topRes.status}/${bottomRes.status})`,
    );
  }
  const [topBlob, bottomBlob] = await Promise.all([topRes.blob(), bottomRes.blob()]);
  const [topImg, bottomImg] = await Promise.all([blobToImage(topBlob), blobToImage(bottomBlob)]);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(topImg.width, bottomImg.width);
  canvas.height = topImg.height + bottomImg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageFetchError('Canvasコンテキストの取得に失敗しました');
  ctx.drawImage(topImg, 0, 0);
  ctx.drawImage(bottomImg, 0, topImg.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ImageFetchError('画像の結合に失敗しました'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageFetchError('タイル画像の読み込みに失敗しました'));
    img.src = url;
  });
}

/** ローカルファイルからの画像読み込み (Worker未設定時のフォールバック用) */
export function loadImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageFetchError('画像ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

export function isImageProxyConfigured(): boolean {
  return Boolean(PROXY_BASE_URL);
}
