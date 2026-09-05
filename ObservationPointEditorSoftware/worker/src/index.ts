/**
 * ObservationPointEditor 用の画像プロキシ Worker。
 *
 * 強震モニタ (kmoni) および海しる (umishiru/MSIL) は CORS を許可していないため、
 * ブラウザから直接 fetch できない。このWorkerがサーバーサイドで代理取得し、
 * CORSヘッダーを付与してフロントエンドに返す。
 *
 * デプロイ:
 *   cd worker
 *   npm install
 *   npx wrangler deploy
 *
 * エンドポイント:
 *   GET /kmoni/latest
 *     -> kmoniの最新画像時刻を取得して { latest_time } 形式で返す
 *   GET /kmoni/image?timestamp=YYYYMMDDHHMMSS&kind=shindo|accel
 *     -> 指定時刻の震度分布画像 (shindo) または最大加速度画像 (accel) を返す
 *   GET /umishiru/tile?time=YYYYMMDDHHMMSS&y=11|12
 *     -> 海しる (S-net強震動情報) のタイル画像 (z=5, x=28 固定) を取得する。
 *        time を省略した場合は、リクエスト時刻から自動計算する
 *        (computeUmishiruTimestamp を参照)。
 *   GET /umishiru/latest
 *     -> 現在時刻から計算した海しるタイルの time パラメータを { time } 形式で返す
 */

import { computeUmishiruTimestamp } from './umishiruTime';

export interface Env {
  /** 許可するオリジン (GitHub Pagesのドメインなど)。カンマ区切りで複数指定可。 */
  ALLOWED_ORIGINS: string;
  /** 海しるデータ取得の追加遅延 (分)。データが不安定な場合の安全マージン用。既定 0。 */
  UMISHIRU_DELAY_MINUTES?: string;
}

const KMONI_BASE = 'http://www.kmoni.bosai.go.jp';
const MSIL_TILE_BASE = 'https://www.msil.go.jp/data/tiles/smoni/tileimage';
const UMISHIRU_TILE_Z = 5;
const UMISHIRU_TILE_X = 28;
const UMISHIRU_VALID_Y = [11, 12];

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] ?? '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=5',
  };
}

function jsonResponse(data: unknown, origin: string | null, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
  });
}

function errorResponse(message: string, origin: string | null, env: Env, status = 502): Response {
  return jsonResponse({ error: message }, origin, env, status);
}

async function handleKmoniLatest(origin: string | null, env: Env): Promise<Response> {
  const upstream = `${KMONI_BASE}/webservice/server/pros/latest.json`;
  const res = await fetch(upstream, { cf: { cacheTtl: 3, cacheEverything: true } });
  if (!res.ok) return errorResponse(`kmoni latest.json fetch failed: ${res.status}`, origin, env);
  const json = await res.json();
  return jsonResponse(json, origin, env);
}

async function handleKmoniImage(url: URL, origin: string | null, env: Env): Promise<Response> {
  const timestamp = url.searchParams.get('timestamp'); // YYYYMMDDHHMMSS
  const kind = url.searchParams.get('kind') === 'accel' ? 'acmap_s' : 'jma_s';

  if (!timestamp || !/^\d{14}$/.test(timestamp)) {
    return errorResponse('timestamp は YYYYMMDDHHMMSS 形式で指定してください', origin, env, 400);
  }
  const dir = timestamp.slice(0, 8);
  const upstream = `${KMONI_BASE}/data/map_img/RealTimeImg/${kind}/${dir}/${timestamp}.${kind}.gif`;

  const res = await fetch(upstream, { cf: { cacheTtl: 5, cacheEverything: true } });
  if (!res.ok) return errorResponse(`kmoni image fetch failed: ${res.status}`, origin, env, res.status);

  const headers = new Headers(corsHeaders(origin, env));
  headers.set('Content-Type', res.headers.get('Content-Type') ?? 'image/gif');
  return new Response(res.body, { status: 200, headers });
}

function resolveUmishiruTime(url: URL, env: Env): string {
  const provided = url.searchParams.get('time');
  if (provided) {
    if (!/^\d{14}$/.test(provided)) {
      throw new Error('time は YYYYMMDDHHMMSS 形式で指定してください');
    }
    return provided;
  }
  const delayMinutes = Number(env.UMISHIRU_DELAY_MINUTES ?? '0') || 0;
  return computeUmishiruTimestamp(new Date(), delayMinutes);
}

async function handleUmishiruLatest(url: URL, origin: string | null, env: Env): Promise<Response> {
  try {
    const time = resolveUmishiruTime(url, env);
    return jsonResponse({ time }, origin, env);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), origin, env, 400);
  }
}

async function handleUmishiruTile(url: URL, origin: string | null, env: Env): Promise<Response> {
  let time: string;
  try {
    time = resolveUmishiruTime(url, env);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), origin, env, 400);
  }

  const yParam = Number(url.searchParams.get('y') ?? UMISHIRU_VALID_Y[0]);
  if (!UMISHIRU_VALID_Y.includes(yParam)) {
    return errorResponse(`y は ${UMISHIRU_VALID_Y.join(' または ')} を指定してください`, origin, env, 400);
  }

  // タイルURL形式: {base}/{time}/{time}/{z}/{x}/{y}.png
  const upstream = `${MSIL_TILE_BASE}/${time}/${time}/${UMISHIRU_TILE_Z}/${UMISHIRU_TILE_X}/${yParam}.png`;

  const res = await fetch(upstream, { cf: { cacheTtl: 5, cacheEverything: true } });
  if (!res.ok) return errorResponse(`umishiru tile fetch failed: ${res.status} (${upstream})`, origin, env, res.status);

  const headers = new Headers(corsHeaders(origin, env));
  headers.set('Content-Type', res.headers.get('Content-Type') ?? 'image/png');
  headers.set('X-Umishiru-Time', time);
  return new Response(res.body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin, env) });
    }

    try {
      if (url.pathname === '/kmoni/latest') return await handleKmoniLatest(origin, env);
      if (url.pathname === '/kmoni/image') return await handleKmoniImage(url, origin, env);
      if (url.pathname === '/umishiru/latest') return await handleUmishiruLatest(url, origin, env);
      if (url.pathname === '/umishiru/tile') return await handleUmishiruTile(url, origin, env);
      return errorResponse('not found', origin, env, 404);
    } catch (e) {
      return errorResponse(`internal error: ${e instanceof Error ? e.message : String(e)}`, origin, env, 500);
    }
  },
};
