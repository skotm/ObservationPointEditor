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
              border: '1px solid var(--c-border)',
              borderRadius: 4,
              padding: '8px 10px',
              color: 'var(--c-text-0)',
              cursor: 'pointer',
            }}
          >
            <span className="mono">{c.code}</span> ・ {c.name}{' '}
            <span style={{ color: 'var(--c-text-2)', fontSize: 12 }}>({TYPE_LABEL[c.type]})</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
