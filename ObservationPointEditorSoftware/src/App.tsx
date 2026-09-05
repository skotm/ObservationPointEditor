import { useCallback, useState } from 'react';
import type {
  CommonObservationPoint,
  ConsolidationResult,
  ImportResult,
  TransparentPixelPointResult,
  UnassignedPixelResult,
} from '@/types';
import { useObservationPoints } from '@/hooks/useObservationPoints';
import { useFileIO } from '@/hooks/useFileIO';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Toolbar } from '@/components/Toolbar';
import { LeftPanel } from '@/components/LeftPanel';
import { MapCanvas } from '@/components/MapCanvas';
import { DataGridPanel } from '@/components/DataGridPanel';
import { SelectPointDialog } from '@/components/Dialogs/SelectPointDialog';
import { ImportResultDialog } from '@/components/Dialogs/ImportResultDialog';
import { ConsolidationResultDialog } from '@/components/Dialogs/ConsolidationResultDialog';
import { PixelDetectionDialog } from '@/components/Dialogs/PixelDetectionDialog';
import { ErrorDialog } from '@/components/Dialogs/ErrorDialog';
import { consolidateDuplicates } from '@/services/duplicateConsolidation';
import { mergeImportedPoints, parseNiedCsv } from '@/services/importService';
import { findTransparentPixelPoints, findUnassignedPixels } from '@/services/pixelDetection';
import {
  fetchKmoniImage,
  fetchKmoniLatestTimestamp,
  fetchUmiShiruImage,
  loadImageFromFile,
} from '@/services/imageService';

export default function App() {
  const store = useObservationPoints();
  const fileIO = useFileIO();

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CommonObservationPoint[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null);
  const [pixelResult, setPixelResult] = useState<{
    unassigned: UnassignedPixelResult | null;
    transparent: TransparentPixelPointResult[] | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleError = useCallback((message: string) => setErrorMessage(message), []);

  // --- ファイル操作 ---
  const handleNewFile = useCallback(() => {
    if (store.isDirty && !confirm('保存されていない変更があります。新規作成しますか?')) return;
    store.loadPoints([]);
    setBackgroundUrl(null);
  }, [store]);

  const handleOpenJson = useCallback(
    async (file: File) => {
      const points = await fileIO.openJsonFile(file);
      if (points) store.loadPoints(points);
    },
    [fileIO, store],
  );

  const handleOpenKmop = useCallback(
    async (file: File) => {
      const points = await fileIO.openKmopFile(file);
      if (points) store.loadPoints(points);
    },
    [fileIO, store],
  );

  const handleSaveJson = useCallback(() => {
    fileIO.saveAsJson(store.points);
    store.markSaved();
  }, [fileIO, store]);

  const handleSaveKmop = useCallback(() => {
    fileIO.saveAsKmop(store.points, new Date().toISOString().slice(0, 10));
    store.markSaved();
  }, [fileIO, store]);

  // --- NIED CSV 取り込み ---
  const handleImportCsv = useCallback(
    async (file: File, sourceFile: 'sitepub_kik_sj.csv' | 'sitepub_knet_sj.csv' | 'sitepub_snet_sj.csv') => {
      try {
        const text = await file.text();
        const { points: parsed, errorLines } = parseNiedCsv(text, sourceFile);
        const { points: merged, result } = mergeImportedPoints(store.points, parsed, errorLines);
        store.replaceAllPoints(merged);
        setImportResult(result);
      } catch (e) {
        handleError(`CSV取り込みに失敗しました: ${String(e)}`);
      }
    },
    [store, handleError],
  );

  // --- 重複統合 ---
  const handleConsolidate = useCallback(() => {
    const { points, result } = consolidateDuplicates(store.points);
    store.replaceAllPoints(points);
    setConsolidationResult(result);
  }, [store]);

  // --- 背景画像 ---
  const handleLoadBackgroundFromFile = useCallback(async (file: File) => {
    try {
      const url = await loadImageFromFile(file);
      setBackgroundUrl(url);
    } catch (e) {
      handleError(String(e));
    }
  }, [handleError]);

  const handleLoadBackgroundFromKmoni = useCallback(async () => {
    try {
      const latest = await fetchKmoniLatestTimestamp();
      const url = await fetchKmoniImage(latest, 'shindo');
      setBackgroundUrl(url);
    } catch (e) {
      handleError(
        `kmoni画像の取得に失敗しました。Cloudflare Workerプロキシの設定 (.env.local の VITE_IMAGE_PROXY_BASE_URL) を確認してください。\n詳細: ${String(e)}`,
      );
    }
  }, [handleError]);

  const handleLoadBackgroundFromUmishiru = useCallback(async () => {
    try {
      // time を省略すると Worker 側で現在時刻から自動計算される
      const url = await fetchUmiShiruImage();
      setBackgroundUrl(url);
    } catch (e) {
      handleError(
        `海しる画像の取得に失敗しました。Cloudflare Workerプロキシの設定 (.env.local の VITE_IMAGE_PROXY_BASE_URL) を確認してください。\n詳細: ${String(e)}`,
      );
    }
  }, [handleError]);

  // --- ピクセル検出 ---
  // MapCanvas はパン/ズーム後の状態を内部で持つため、検出処理では
  // 元画像を専用の非表示canvasに再描画してオリジナル解像度のImageDataを取得する。
  const handleDetectUnassigned = useCallback(() => {
    if (!backgroundUrl) {
      handleError('先に背景画像を読み込んでください。');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = findUnassignedPixels(
        imageData,
        store.points,
        // 完全な背景色 (透明 or 白系) 以外を「データが乗っているピクセル」とみなす簡易判定。
        // 強震モニタ画像の正確な背景色に合わせて調整してください。
        (r, g, b, a) => a > 10 && !(r > 245 && g > 245 && b > 245),
      );
      setPixelResult({ unassigned: result, transparent: null });
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, store.points, handleError]);

  const handleDetectTransparent = useCallback(() => {
    if (!backgroundUrl) {
      handleError('先に背景画像を読み込んでください。');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = findTransparentPixelPoints(imageData, store.points, (r, g, b, a) => a <= 10 || (r > 245 && g > 245 && b > 245));
      setPixelResult({ unassigned: null, transparent: result });
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, store.points, handleError]);

  // --- 地図操作 ---
  const handleSelectPoint = useCallback((code: string | null) => store.setSelectedCode(code), [store]);

  const handleMultiCandidates = useCallback((pts: CommonObservationPoint[]) => setCandidates(pts), []);

  const handleMovePoint = useCallback(
    (code: string, center: { x: number; y: number }) => {
      const current = store.points.find((p) => p.code === code);
      const offset = current?.point?.offset ?? { x: 0, y: 0 };
      store.applyPointChange(code, { center, offset });
    },
    [store],
  );

  // --- キーボードショートカット ---
  useKeyboardShortcuts({
    onUndo: store.undo,
    onRedo: store.redo,
    onSave: handleSaveJson,
    onDelete: () => {
      if (store.selectedCode) store.removeSelected(new Set([store.selectedCode]));
    },
    onEscape: () => store.setSelectedCode(null),
    onArrowMove: (dx, dy, fine) => {
      if (!store.selectedPoint?.point) return;
      const step = fine ? 1 : 5;
      const p = store.selectedPoint.point;
      store.applyPointChange(store.selectedPoint.code, {
        center: p.center,
        offset: { x: p.offset.x + dx * step, y: p.offset.y + dy * step },
      });
    },
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        onNewFile={handleNewFile}
        onOpenJson={handleOpenJson}
        onOpenKmop={handleOpenKmop}
        onSaveJson={handleSaveJson}
        onSaveKmop={handleSaveKmop}
        onImportCsv={handleImportCsv}
        onConsolidate={handleConsolidate}
        onDetectUnassigned={handleDetectUnassigned}
        onDetectTransparent={handleDetectTransparent}
        onLoadBackgroundFromFile={handleLoadBackgroundFromFile}
        onLoadBackgroundFromKmoni={handleLoadBackgroundFromKmoni}
        onLoadBackgroundFromUmishiru={handleLoadBackgroundFromUmishiru}
        onUndo={store.undo}
        onRedo={store.redo}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        isDirty={store.isDirty}
        hasBackground={!!backgroundUrl}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftPanel
          filter={store.filter}
          onFilterChange={store.setFilter}
          stats={store.stats}
          filteredCount={store.filteredData.filteredCount}
          totalCount={store.filteredData.totalCount}
          selectedPoint={store.selectedPoint}
          onPatchSelected={(patch) => store.selectedPoint && store.patchPoint(store.selectedPoint.code, patch)}
          onAddPoint={store.addPoint}
          onDeleteSelected={() => store.selectedCode && store.removeSelected(new Set([store.selectedCode]))}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapCanvas
              points={store.filteredData.points}
              selectedCode={store.selectedCode}
              backgroundImageUrl={backgroundUrl}
              onSelectPoint={handleSelectPoint}
              onMultiCandidates={handleMultiCandidates}
              onMovePoint={handleMovePoint}
            />
          </div>
          <DataGridPanel points={store.filteredData.points} selectedCode={store.selectedCode} onSelect={handleSelectPoint} />
        </div>
      </div>

      {candidates && (
        <SelectPointDialog
          candidates={candidates}
          onSelect={(code) => {
            store.setSelectedCode(code);
            setCandidates(null);
          }}
          onClose={() => setCandidates(null)}
        />
      )}
      {importResult && <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />}
      {consolidationResult && (
        <ConsolidationResultDialog result={consolidationResult} onClose={() => setConsolidationResult(null)} />
      )}
      {pixelResult && (
        <PixelDetectionDialog
          unassigned={pixelResult.unassigned}
          transparent={pixelResult.transparent}
          onSelectCode={(code) => {
            store.setSelectedCode(code);
            setPixelResult(null);
          }}
          onClose={() => setPixelResult(null)}
        />
      )}
      {(errorMessage || fileIO.error) && (
        <ErrorDialog
          message={errorMessage ?? fileIO.error ?? ''}
          onClose={() => {
            setErrorMessage(null);
            fileIO.clearError();
          }}
        />
      )}
    </div>
  );
}
