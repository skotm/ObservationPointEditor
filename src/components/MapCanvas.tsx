import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { CommonObservationPoint } from '@/types';
import { TYPE_MARKER_COLOR } from '@/utils/shindoColorScale';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  findPointsNear,
  getReadingPixel,
  imagePixelToScreen,
  screenToImagePixel,
} from '@/utils/geometry';

interface MapCanvasProps {
  points: CommonObservationPoint[];
  selectedCode: string | null;
  backgroundImageUrl: string | null;
  onSelectPoint: (code: string | null) => void;
  onMultiCandidates: (points: CommonObservationPoint[]) => void;
  onMovePoint: (code: string, center: { x: number; y: number }) => void;
  onDebugInfo?: (info: { pixel: { x: number; y: number } | null }) => void;
}

const HIT_RADIUS_PX = 10;

export function MapCanvas({
  points,
  selectedCode,
  backgroundImageUrl,
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
  const panningRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);

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

    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, w, h);

    if (imgRef.current) {
      const img = imgRef.current;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pan.x, pan.y, img.width * zoom, img.height * zoom);
    } else {
      ctx.fillStyle = '#6d7c8c';
      ctx.font = '13px sans-serif';
      ctx.fillText('背景画像が読み込まれていません', 16, 24);
    }

    for (const p of points) {
      const reading = getReadingPixel(p);
      if (!reading) continue;
      const screenPos = imagePixelToScreen(reading, pan.x, pan.y, zoom);
      if (screenPos.x < -20 || screenPos.y < -20 || screenPos.x > w + 20 || screenPos.y > h + 20) continue;

      const isSelected = p.code === selectedCode;
      const color = p.isSuspended ? TYPE_MARKER_COLOR.suspended : TYPE_MARKER_COLOR[p.type];

      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.isSuspended ? 0.5 : 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (isSelected) {
        ctx.strokeStyle = '#3ddbd9';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3x3 読み取り範囲のハイライト
        const cellSize = zoom;
        ctx.strokeStyle = 'rgba(61, 219, 217, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          screenPos.x - 1.5 * cellSize,
          screenPos.y - 1.5 * cellSize,
          cellSize * 3,
          cellSize * 3,
        );
      }
    }
  }, [points, selectedCode, pan, zoom]);

  useEffect(() => {
    draw();
  }, [draw, imgLoaded]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const getPixelFromEvent = useCallback(
    (e: ReactMouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return screenToImagePixel(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
    },
    [pan, zoom],
  );

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
    [getPixelFromEvent, onMultiCandidates, onSelectPoint, pan, points, zoom],
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
        onMovePoint(draggingRef.current.code, { x: Math.round(pixel.x), y: Math.round(pixel.y) });
      }
    },
    [getPixelFromEvent, onDebugInfo, onMovePoint],
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
        style={{ display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(18, 24, 31, 0.85)',
          border: '1px solid var(--c-border)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 12,
          color: 'var(--c-text-1)',
        }}
        className="mono"
      >
        zoom {zoom.toFixed(2)}x ・ Alt+ドラッグでパン ・ ホイールでズーム
      </div>
    </div>
  );
}
