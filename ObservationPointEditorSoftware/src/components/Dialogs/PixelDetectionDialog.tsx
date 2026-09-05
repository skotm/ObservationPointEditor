import type { CSSProperties } from 'react';
import type { TransparentPixelPointResult, UnassignedPixelResult } from '@/types';
import { Modal } from '@/components/Dialogs/Modal';

interface PixelDetectionDialogProps {
  unassigned: UnassignedPixelResult | null;
  transparent: TransparentPixelPointResult[] | null;
  onJumpTo?: (x: number, y: number) => void;
  onSelectCode?: (code: string) => void;
  onClose: () => void;
}

export function PixelDetectionDialog({
  unassigned,
  transparent,
  onJumpTo,
  onSelectCode,
  onClose,
}: PixelDetectionDialogProps) {
  return (
    <Modal
      title="ピクセル検出結果"
      onClose={onClose}
      width={560}
      footer={
        <button onClick={onClose} style={okButton}>
          閉じる
        </button>
      }
    >
      {unassigned && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            未割当ピクセル: <strong className="mono">{unassigned.unassignedCount}</strong> 件
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {unassigned.samples.slice(0, 100).map((s, i) => (
              <button
                key={i}
                onClick={() => onJumpTo?.(s.x, s.y)}
                style={rowButton}
              >
                <span className="mono">
                  ({s.x}, {s.y})
                </span>{' '}
                {s.nearestCode && <span style={{ color: 'var(--c-text-2)' }}>最寄り: {s.nearestCode}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {transparent && (
        <div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            読み取り範囲が透明な観測点: <strong className="mono">{transparent.length}</strong> 件
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {transparent.map((t) => (
              <button key={t.code} onClick={() => onSelectCode?.(t.code)} style={rowButton}>
                <span className="mono">{t.code}</span> ・ {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!unassigned && (!transparent || transparent.length === 0) && (
        <div style={{ color: 'var(--c-text-2)', fontSize: 13 }}>問題は検出されませんでした。</div>
      )}
    </Modal>
  );
}

const rowButton: CSSProperties = {
  textAlign: 'left',
  background: 'var(--c-bg-2)',
  border: '1px solid var(--c-border)',
  borderRadius: 4,
  padding: '6px 10px',
  color: 'var(--c-text-0)',
  cursor: 'pointer',
  fontSize: 12,
};

const okButton: CSSProperties = {
  padding: '7px 16px',
  background: 'var(--c-accent)',
  color: '#1a0e05',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer',
};
