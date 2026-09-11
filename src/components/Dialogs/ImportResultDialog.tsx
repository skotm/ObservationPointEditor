import type { ImportResult } from '@/types';
import { Modal } from '@/components/Dialogs/Modal';

interface ImportResultDialogProps {
  result: ImportResult;
  onClose: () => void;
}

export function ImportResultDialog({ result, onClose }: ImportResultDialogProps) {
  return (
    <Modal
      title="CSVインポート結果"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="btn btn-primary">
          OK
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Stat label="追加" value={result.addedCount} color="var(--c-green)" />
        <Stat label="更新" value={result.updatedCount} color="var(--c-cyan)" />
        <Stat label="スキップ" value={result.skippedCount} color="var(--c-label-tertiary)" />
        <Stat label="エラー行数" value={result.errorLines.length} color="var(--c-red)" />
      </div>
      {result.errorLines.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--c-label-tertiary)' }}>
          エラー行: {result.errorLines.slice(0, 30).join(', ')}
          {result.errorLines.length > 30 ? ' ...' : ''}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--c-bg-2)', border: '1px solid var(--c-separator)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--c-label-tertiary)' }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

