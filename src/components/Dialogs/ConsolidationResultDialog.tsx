import type { ConsolidationResult } from '@/types';
import { Modal } from '@/components/Dialogs/Modal';

interface ConsolidationResultDialogProps {
  result: ConsolidationResult;
  onClose: () => void;
}

export function ConsolidationResultDialog({ result, onClose }: ConsolidationResultDialogProps) {
  return (
    <Modal
      title="重複統合結果"
      onClose={onClose}
      width={560}
      footer={
        <button onClick={onClose} className="btn btn-primary">
          OK
        </button>
      }
    >
      <div style={{ marginBottom: 12, fontSize: 13 }}>
        <strong className="mono">{result.groupCount}</strong> グループの重複を検出し、
        <strong className="mono"> {result.removedCount}</strong> 件を統合しました。
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result.details.map((d) => (
          <div key={d.code} style={{ background: 'var(--c-bg-2)', border: '1px solid var(--c-separator)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--c-cyan)', marginBottom: 4 }}>
              {d.code}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-label-tertiary)' }}>
              {d.before.length} 件を統合 → 「{d.after.name}」({d.after.point ? '座標あり' : '座標未設定'})
            </div>
          </div>
        ))}
        {result.details.length === 0 && (
          <div style={{ color: 'var(--c-label-tertiary)', fontSize: 13 }}>重複するコードは見つかりませんでした。</div>
        )}
      </div>
    </Modal>
  );
}

