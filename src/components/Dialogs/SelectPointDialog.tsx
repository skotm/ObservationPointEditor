import type { CommonObservationPoint } from '@/types';
import { TYPE_LABEL } from '@/utils/formatters';
import { Modal } from '@/components/Dialogs/Modal';

interface SelectPointDialogProps {
  candidates: CommonObservationPoint[];
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function SelectPointDialog({ candidates, onSelect, onClose }: SelectPointDialogProps) {
  return (
    <Modal title="近接する観測点が複数あります" onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {candidates.map((c) => (
          <button
            key={c.code}
            onClick={() => onSelect(c.code)}
            style={{
              textAlign: 'left',
              background: 'var(--c-bg-2)',
              border: '1px solid var(--c-separator)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              color: 'var(--c-label)',
              cursor: 'pointer',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--c-bg-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--c-bg-2)';
            }}
          >
            <span className="mono">{c.code}</span> ・ {c.name}{' '}
            <span style={{ color: 'var(--c-label-tertiary)', fontSize: 12 }}>({TYPE_LABEL[c.type]})</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
