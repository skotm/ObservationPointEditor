import type { CSSProperties } from 'react';
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
        <button onClick={onClose} style={okButton}>
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
          <div key={d.code} style={{ background: 'var(--c-bg-2)', border: '1px solid var(--c-border)', borderRadius: 6, padding: 10 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--c-cyan)', marginBottom: 4 }}>
              {d.code}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
              {d.before.length} 件を統合 → 「{d.after.name}」({d.after.point ? '座標あり' : '座標未設定'})
            </div>
          </div>
        ))}
        {result.details.length === 0 && (
          <div style={{ color: 'var(--c-text-2)', fontSize: 13 }}>重複するコードは見つかりませんでした。</div>
        )}
      </div>
    </Modal>
  );
}

const okButton: CSSProperties = {
  padding: '7px 16px',
  background: 'var(--c-accent)',
  color: '#1a0e05',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer',
};
