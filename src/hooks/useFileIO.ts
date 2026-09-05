import { useCallback, useState } from 'react';
import type { CommonObservationPoint } from '@/types';
import { FileOperationException } from '@/types';
import { deserializePoints, serializePoints } from '@/utils/fileFormat';
import { deserializeKmop, serializeKmop } from '@/utils/kmop';

export function useFileIO() {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const openJsonFile = useCallback(async (file: File): Promise<CommonObservationPoint[] | null> => {
    setIsBusy(true);
    setError(null);
    try {
      const text = await file.text();
      return deserializePoints(text);
    } catch (e) {
      setError(e instanceof FileOperationException ? e.message : `ファイルの読み込みに失敗しました: ${String(e)}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openKmopFile = useCallback(async (file: File): Promise<CommonObservationPoint[] | null> => {
    setIsBusy(true);
    setError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { points } = deserializeKmop(buf);
      return points;
    } catch (e) {
      setError(e instanceof FileOperationException ? e.message : `KMOPファイルの読み込みに失敗しました: ${String(e)}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const saveAsJson = useCallback((points: CommonObservationPoint[], filename = 'observation_points.json') => {
    try {
      const text = serializePoints(points, true);
      const blob = new Blob([text], { type: 'application/json' });
      downloadBlob(blob, filename);
    } catch (e) {
      setError(`保存に失敗しました: ${String(e)}`);
    }
  }, []);

  const saveAsKmop = useCallback(
    (points: CommonObservationPoint[], dataVersion: string, filename = 'observation_points.kmop') => {
      try {
        const bytes = serializeKmop(points, dataVersion);
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
        downloadBlob(blob, filename);
      } catch (e) {
        setError(`KMOP保存に失敗しました: ${String(e)}`);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { openJsonFile, openKmopFile, saveAsJson, saveAsKmop, error, clearError, isBusy };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
