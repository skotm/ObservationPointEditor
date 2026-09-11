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
  getReadingPixel,
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

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (imgRef.current) {
      const img = imgRef.current;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pan.x, pan.y, img.width * zoom, img.height * zoom);
    } else {
      ctx.fillStyle = '#6b7480';
      ctx.font = '13px sans-serif';
      ctx.fillText('背景画像が読み込まれていません', 16, 24);
    }

    // ピクセルグリッド (十分ズームしている場合のみ表示)
    if (showGrid && zoom >= GRID_MIN_ZOOM) {
      const minX = Math.floor(-pan.x / zoom);
      const maxX = Math.ceil((w - pan.x) / zoom);
      const minY = Math.floor(-pan.y / zoom);
      const maxY = Math.ceil((h - pan.y) / zoom);

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

    for (const p of points) {
      const reading = getReadingPixel(p);
      if (!reading) continue;
      const screenPos = imagePixelToScreen(reading, pan.x, pan.y, zoom);
      if (screenPos.x < -20 || screenPos.y < -20 || screenPos.x > w + 20 || screenPos.y > h + 20) continue;

      const isSelected = p.code === selectedCode;
      const color = p.isSuspended ? TYPE_MARKER_COLOR.suspended : TYPE_MARKER_COLOR[p.type];

      // 読み取り範囲 (3x3ピクセル) を種別カラーの点線枠で表示する
      if (showReadingArea) {
        const cellSize = zoom;
        ctx.save();
        ctx.setLineDash([Math.max(2, zoom * 0.3), Math.max(2, zoom * 0.3)]);
        ctx.strokeStyle = color;
        ctx.globalAlpha = p.isSuspended ? 0.45 : 0.85;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(
          screenPos.x - 1.5 * cellSize,
          screenPos.y - 1.5 * cellSize,
          cellSize * 3,
          cellSize * 3,
        );
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.isSuspended ? 0.5 : 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (isSelected) {
        ctx.strokeStyle = '#40d8d0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 選択中の観測点は読み取り範囲を実線・シアンで強調する
        const cellSize = zoom;
        ctx.strokeStyle = 'rgba(64, 216, 208, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          screenPos.x - 1.5 * cellSize,
          screenPos.y - 1.5 * cellSize,
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
    return screenToImagePixel(clientX, clientY, rect, curPan.x, curPan.y, curZoom);
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
        onMovePoint(draggingRef.current.code, {
            x: roundToPrecision(pixel.x, decimalMode),
            y: roundToPrecision(pixel.y, decimalMode),
          });
      }
    },
    [decimalMode, getPixelFromEvent, onDebugInfo, onMovePoint],
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
          onMovePoint(draggingRef.current.code, {
            x: roundToPrecision(pixel.x, decimalMode),
            y: roundToPrecision(pixel.y, decimalMode),
          });
        }
      }
    },
    [decimalMode, getPixelFromPoint, onMovePoint],
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
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
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
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          background: 'rgba(28, 30, 34, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--c-separator-strong)',
          borderRadius: 'var(--radius-pill)',
          padding: '6px 14px',
          fontSize: 12,
          color: 'var(--c-label-secondary)',
          boxShadow: 'var(--shadow-sm)',
        }}
        className="mono"
      >
        zoom {zoom.toFixed(2)}x{showGrid && zoom < GRID_MIN_ZOOM ? ` (グリッドは${GRID_MIN_ZOOM}倍以上で表示)` : ''} ・ Alt+ドラッグ/1本指でパン
        ・ ホイール/ピンチでズーム
      </div>
    </div>
  );
}