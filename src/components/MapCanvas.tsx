import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  Touch as ReactTouch,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import type { CommonObservationPoint } from '@/types';
import { TYPE_MARKER_COLOR } from '@/utils/shindoColorScale';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  findPointsNear,
  imagePixelToScreen,
  roundToPrecision,
  screenToImagePixel,
} from '@/utils/geometry';

interface MapCanvasProps {
  points: CommonObservationPoint[];
  selectedCode: string | null;
  backgroundImageUrl: string | null;
  decimalMode: boolean;
  showGrid: boolean;
  showReadingArea: boolean;
  onSelectPoint: (code: string | null) => void;
  onMultiCandidates: (points: CommonObservationPoint[]) => void;
  onMovePoint: (code: string, center: { x: number; y: number }) => void;
  onDebugInfo?: (info: { pixel: { x: number; y: number } | null }) => void;
}

const HIT_RADIUS_PX = 10;
/** タッチ操作は指が太い分、マウスより広めの当たり判定にする */
const TOUCH_HIT_RADIUS_PX = 22;
/** このズーム倍率未満ではグリッドが密集しすぎて見づらいため非表示にする */
const GRID_MIN_ZOOM = 4;
/** このズーム倍率未満では読み取り範囲の枠が小さすぎて意味を成さず、
 * 観測点数が多いと描画負荷も大きいため非表示にする */
const READING_AREA_MIN_ZOOM = 2;
/** 10ピクセルごとに少し目立つ「主グリッド線」を引く間隔 */
const GRID_MAJOR_INTERVAL = 10;

interface PanState {
  startX: number;
  startY: number;
  startPan: { x: number; y: number };
}

interface PinchState {
  startDist: number;
  startZoom: number;
  startPan: { x: number; y: number };
  startMid: { x: number; y: number };
}

export function MapCanvas({
  points,
  selectedCode,
  backgroundImageUrl,
  decimalMode,
  showGrid,
  showReadingArea,
  onSelectPoint,
  onMultiCandidates,
  onMovePoint,
  onDebugInfo,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const draggingRef = useRef<{ code: string; part: 'center' } | null>(null);
  const panningRef = useRef<PanState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  // ドラッグ中の座標更新をアニメーションフレームに合わせて間引くための仕組み。
  // マウス/タッチのmoveイベントは画面更新より高頻度で発火することがあり、
  // 毎回 onMovePoint (=観測点配列全体の再生成+全体再描画) を呼ぶと、
  // 観測点数が多い場合にアプリ全体が重くなる。1フレームにつき最新の1回だけ反映する。
  const pendingMoveRef = useRef<{ code: string; pixel: { x: number; y: number } } | null>(null);
  const moveFrameRef = useRef<number | null>(null);

  const scheduleMovePoint = useCallback(
    (code: string, pixel: { x: number; y: number }) => {
      pendingMoveRef.current = { code, pixel };
      if (moveFrameRef.current == null) {
        moveFrameRef.current = requestAnimationFrame(() => {
          moveFrameRef.current = null;
          const pending = pendingMoveRef.current;
          pendingMoveRef.current = null;
          if (pending) onMovePoint(pending.code, pending.pixel);
        });
      }
    },
    [onMovePoint],
  );

  useEffect(() => {
    return () => {
      if (moveFrameRef.current != null) cancelAnimationFrame(moveFrameRef.current);
    };
  }, []);
  // 最新の pan/zoom をイベントハンドラ内から同期的に参照するための ref
  // (setState は非同期のため、同一ジェスチャー内で連続して読み書きする場合に必要)
  const panZoomRef = useRef({ pan, zoom });
  useEffect(() => {
    panZoomRef.current = { pan, zoom };
  }, [pan, zoom]);

  // 背景画像読み込み
  useEffect(() => {
    if (!backgroundImageUrl) {
      imgRef.current = null;
      setImgLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (imgRef.current) {
      const img = imgRef.current;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pan.x, pan.y, img.width * zoom, img.height * zoom);
    } else {
      ctx.fillStyle = '#737170';
      ctx.font = '13px sans-serif';
      ctx.fillText('背景画像が読み込まれていません', 16, 24);
    }

    // ピクセルグリッド (十分ズームしている場合のみ表示)
    // グリッド線は「実際の画像データのピクセル境界」を示すため整数座標に引く。
    // (背景画像は ctx.drawImage で描画されており、ピクセル境界は必ず整数座標に来るため)
    if (showGrid && zoom >= GRID_MIN_ZOOM) {
      const minX = Math.floor(-pan.x / zoom) - 1;
      const maxX = Math.ceil((w - pan.x) / zoom) + 1;
      const minY = Math.floor(-pan.y / zoom) - 1;
      const maxY = Math.ceil((h - pan.y) / zoom) + 1;

      ctx.save();
      ctx.lineWidth = 1;
      for (let x = minX; x <= maxX; x++) {
        const screenX = Math.round(x * zoom + pan.x) + 0.5;
        if (screenX < -1 || screenX > w + 1) continue;
        const isMajor = x % GRID_MAJOR_INTERVAL === 0;
        ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.09)';
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, h);
        ctx.stroke();
      }
      for (let y = minY; y <= maxY; y++) {
        const screenY = Math.round(y * zoom + pan.y) + 0.5;
        if (screenY < -1 || screenY > h + 1) continue;
        const isMajor = y % GRID_MAJOR_INTERVAL === 0;
        ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.09)';
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(w, screenY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 点線パターンはズーム倍率のみに依存するためループの外で1回だけ計算する
    const dashPattern: [number, number] = [Math.max(2, zoom * 0.3), Math.max(2, zoom * 0.3)];
    const canShowReadingArea = showReadingArea && zoom >= READING_AREA_MIN_ZOOM;

    for (const p of points) {
      if (!p.point) continue;
      // 読み取り範囲ボックスは「基準ピクセル (center)」を中心に固定する。
      // マーカーの丸は、そこから読み取りオフセット (offset) 分ずらした
      // 実際の読み取り位置 (center + offset) に表示する。
      // 保存されているピクセル座標は「そのピクセルの左上」を指す値のため、
      // 実際のピクセルの中心 (見た目上の正しい位置) は +0.5 した位置になる。
      const boxCenterImg = { x: p.point.center.x + 0.5, y: p.point.center.y + 0.5 };
      const dotCenterImg = {
        x: p.point.center.x + p.point.offset.x + 0.5,
        y: p.point.center.y + p.point.offset.y + 0.5,
      };
      const boxScreenPos = imagePixelToScreen(boxCenterImg, pan.x, pan.y, zoom);
      const dotScreenPos = imagePixelToScreen(dotCenterImg, pan.x, pan.y, zoom);
      if (
        boxScreenPos.x < -20 &&
        dotScreenPos.x < -20 &&
        boxScreenPos.y < -20 &&
        dotScreenPos.y < -20
      ) {
        continue;
      }
      if (
        boxScreenPos.x > w + 20 &&
        dotScreenPos.x > w + 20 &&
        boxScreenPos.y > h + 20 &&
        dotScreenPos.y > h + 20
      ) {
        continue;
      }

      const isSelected = p.code === selectedCode;
      const color = p.isSuspended ? TYPE_MARKER_COLOR.suspended : TYPE_MARKER_COLOR[p.type];
      const hasOffset = p.point.offset.x !== 0 || p.point.offset.y !== 0;

      // 読み取り範囲 (3x3ピクセル、center基準) を種別カラーの点線枠で表示する。
      // ズームアウト時 (全体表示など) は枠が意味を成さず描画負荷も大きいため省略する。
      // (save/restore は呼び出しコストが高いため、必要なプロパティのみ都度設定する)
      if (canShowReadingArea) {
        const cellSize = zoom;
        ctx.setLineDash(dashPattern);
        ctx.strokeStyle = color;
        ctx.globalAlpha = p.isSuspended ? 0.45 : 0.85;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(
          boxScreenPos.x - 1.5 * cellSize,
          boxScreenPos.y - 1.5 * cellSize,
          cellSize * 3,
          cellSize * 3,
        );
      }

      // オフセットがある場合、基準ピクセル(小さな十字)と実読み取り位置(丸)を線で結ぶ
      if (hasOffset && canShowReadingArea) {
        ctx.setLineDash([]);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxScreenPos.x, boxScreenPos.y);
        ctx.lineTo(dotScreenPos.x, dotScreenPos.y);
        ctx.stroke();

        // 基準ピクセル位置に小さな十字マークを表示
        const crossSize = 4;
        ctx.beginPath();
        ctx.moveTo(boxScreenPos.x - crossSize, boxScreenPos.y);
        ctx.lineTo(boxScreenPos.x + crossSize, boxScreenPos.y);
        ctx.moveTo(boxScreenPos.x, boxScreenPos.y - crossSize);
        ctx.lineTo(boxScreenPos.x, boxScreenPos.y + crossSize);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(dotScreenPos.x, dotScreenPos.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.isSuspended ? 0.5 : 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (isSelected) {
        ctx.strokeStyle = '#0078d4';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 選択中の観測点は読み取り範囲を実線・青で強調する (center基準)
        const cellSize = zoom;
        ctx.strokeStyle = 'rgba(0, 120, 212, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          boxScreenPos.x - 1.5 * cellSize,
          boxScreenPos.y - 1.5 * cellSize,
          cellSize * 3,
          cellSize * 3,
        );
      }
    }
  }, [points, selectedCode, pan, zoom, showGrid, showReadingArea]);

  useEffect(() => {
    draw();
  }, [draw, imgLoaded]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const getPixelFromPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { pan: curPan, zoom: curZoom } = panZoomRef.current;
    const raw = screenToImagePixel(clientX, clientY, rect, curPan.x, curPan.y, curZoom);
    // 背景画像上の連続座標raw は「ピクセルの中心が x.5 の位置」になる規約。
    // drawImageの仕様上、ピクセルインデックスiは画像空間で i 以上 i+1 未満の範囲を占め、中心は i+0.5 となる。
    // 保存するピクセル座標(center/offset)は「ピクセルインデックス」そのものを表すため、
    // ここで -0.5 して両者の規約を一致させる。これにより、見た目のピクセル中心をクリックした
    // 位置が、そのままそのピクセルのインデックス値として保存/比較されるようになる。
    return { x: raw.x - 0.5, y: raw.y - 0.5 };
  }, []);

  const getPixelFromEvent = useCallback(
    (e: ReactMouseEvent) => getPixelFromPoint(e.clientX, e.clientY),
    [getPixelFromPoint],
  );

  // ---------------- マウス操作 ----------------

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      const pixel = getPixelFromEvent(e);
      if (!pixel) return;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panningRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
        return;
      }

      if (e.button !== 0) return;

      const candidates = findPointsNear(points, pixel, HIT_RADIUS_PX / zoom);
      if (candidates.length === 0) {
        // 座標未設定の観測点が選択中なら、クリック位置をその初期座標として設定する
        const selected = points.find((p) => p.code === selectedCode);
        if (selected && !selected.point) {
          const initial = {
            x: roundToPrecision(pixel.x, decimalMode),
            y: roundToPrecision(pixel.y, decimalMode),
          };
          onMovePoint(selected.code, initial);
          draggingRef.current = { code: selected.code, part: 'center' };
          return;
        }
        onSelectPoint(null);
        return;
      }
      if (candidates.length === 1) {
        onSelectPoint(candidates[0].code);
        draggingRef.current = { code: candidates[0].code, part: 'center' };
      } else {
        onMultiCandidates(candidates);
      }
    },
    [decimalMode, getPixelFromEvent, onMovePoint, onMultiCandidates, onSelectPoint, pan, points, selectedCode, zoom],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (panningRef.current) {
        const dx = e.clientX - panningRef.current.startX;
        const dy = e.clientY - panningRef.current.startY;
        setPan({ x: panningRef.current.startPan.x + dx, y: panningRef.current.startPan.y + dy });
        return;
      }
      const pixel = getPixelFromEvent(e);
      onDebugInfo?.({ pixel });

      if (draggingRef.current) {
        if (!pixel) return;
        scheduleMovePoint(draggingRef.current.code, {
          x: roundToPrecision(pixel.x, decimalMode),
          y: roundToPrecision(pixel.y, decimalMode),
        });
      }
    },
    [decimalMode, getPixelFromEvent, onDebugInfo, scheduleMovePoint],
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    panningRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: ReactWheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);

      // マウス位置を中心にズームする
      const imgX = (mouseX - pan.x) / zoom;
      const imgY = (mouseY - pan.y) / zoom;
      const newPan = {
        x: mouseX - imgX * newZoom,
        y: mouseY - imgY * newZoom,
      };
      setZoom(newZoom);
      setPan(newPan);
    },
    [pan, zoom],
  );

  // ---------------- タッチ操作 ----------------
  // 1本指: 観測点上なら移動、それ以外はパン (Altキーがないため)
  // 2本指: ピンチでズーム (中点を中心に拡大縮小)

  const touchDistance = (t1: ReactTouch, t2: ReactTouch): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const touchMidpoint = (t1: ReactTouch, t2: ReactTouch, rect: DOMRect) => ({
    x: (t1.clientX + t2.clientX) / 2 - rect.left,
    y: (t1.clientY + t2.clientY) / 2 - rect.top,
  });

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (e.touches.length >= 2) {
        // 2本指ジェスチャー開始 (ドラッグ/パンは中断してピンチへ切り替え)
        draggingRef.current = null;
        panningRef.current = null;
        const rect = canvas.getBoundingClientRect();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const { pan: curPan, zoom: curZoom } = panZoomRef.current;
        pinchRef.current = {
          startDist: touchDistance(t1, t2),
          startZoom: curZoom,
          startPan: curPan,
          startMid: touchMidpoint(t1, t2, rect),
        };
        return;
      }

      if (e.touches.length === 1) {
        pinchRef.current = null;
        const touch = e.touches[0];
        const pixel = getPixelFromPoint(touch.clientX, touch.clientY);
        if (!pixel) return;

        const { zoom: curZoom, pan: curPan } = panZoomRef.current;
        const candidates = findPointsNear(points, pixel, TOUCH_HIT_RADIUS_PX / curZoom);
        if (candidates.length === 0) {
          // 座標未設定の観測点が選択中なら、タップ位置をその初期座標として設定する
          const selected = points.find((p) => p.code === selectedCode);
          if (selected && !selected.point) {
            const initial = {
              x: roundToPrecision(pixel.x, decimalMode),
              y: roundToPrecision(pixel.y, decimalMode),
            };
            onMovePoint(selected.code, initial);
            draggingRef.current = { code: selected.code, part: 'center' };
            return;
          }
          // 観測点がない位置 → パン開始
          panningRef.current = { startX: touch.clientX, startY: touch.clientY, startPan: curPan };
          return;
        }
        if (candidates.length === 1) {
          onSelectPoint(candidates[0].code);
          draggingRef.current = { code: candidates[0].code, part: 'center' };
        } else {
          onMultiCandidates(candidates);
        }
      }
    },
    [decimalMode, getPixelFromPoint, onMovePoint, onMultiCandidates, onSelectPoint, points, selectedCode],
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (e.touches.length >= 2 && pinchRef.current) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const newDist = touchDistance(t1, t2);
        const newMid = touchMidpoint(t1, t2, rect);
        const { startDist, startZoom, startPan, startMid } = pinchRef.current;

        const scale = newDist / startDist;
        const newZoom = clamp(startZoom * scale, MIN_ZOOM, MAX_ZOOM);

        // ピンチ開始時の中点を基準にズーム・パンを更新
        const imgX = (startMid.x - startPan.x) / startZoom;
        const imgY = (startMid.y - startPan.y) / startZoom;
        const newPan = {
          x: newMid.x - imgX * newZoom,
          y: newMid.y - imgY * newZoom,
        };
        setZoom(newZoom);
        setPan(newPan);
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];

        if (panningRef.current) {
          e.preventDefault();
          const dx = touch.clientX - panningRef.current.startX;
          const dy = touch.clientY - panningRef.current.startY;
          setPan({ x: panningRef.current.startPan.x + dx, y: panningRef.current.startPan.y + dy });
          return;
        }

        if (draggingRef.current) {
          e.preventDefault();
          const pixel = getPixelFromPoint(touch.clientX, touch.clientY);
          if (!pixel) return;
          scheduleMovePoint(draggingRef.current.code, {
            x: roundToPrecision(pixel.x, decimalMode),
            y: roundToPrecision(pixel.y, decimalMode),
          });
        }
      }
    },
    [decimalMode, getPixelFromPoint, scheduleMovePoint],
  );

  const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
    const canvas = canvasRef.current;
    const remaining = e.touches.length;

    if (remaining === 0) {
      draggingRef.current = null;
      panningRef.current = null;
      pinchRef.current = null;
      return;
    }

    // 2本指 → 1本指に減った場合、残った指を新たな基準にパンとして継続する
    if (remaining === 1 && canvas) {
      pinchRef.current = null;
      draggingRef.current = null;
      const touch = e.touches[0];
      const { pan: curPan } = panZoomRef.current;
      panningRef.current = { startX: touch.clientX, startY: touch.clientY, startPan: curPan };
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ display: 'block', touchAction: 'none' }}
        />
      </div>
      <div
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--c-bg-1)',
          borderTop: '1px solid var(--c-separator-strong)',
          padding: '3px 12px',
          fontSize: 11.5,
          color: 'var(--c-label-secondary)',
        }}
      >
        <span>ズーム: {zoom.toFixed(2)}x</span>
        {showGrid && zoom < GRID_MIN_ZOOM && <span>グリッドは{GRID_MIN_ZOOM}倍以上で表示</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--c-label-tertiary)' }}>
          Alt+ドラッグ/1本指でパン ・ ホイール/ピンチでズーム
        </span>
      </div>
    </div>
  );
}