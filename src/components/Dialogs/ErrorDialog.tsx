import type { CSSProperties } from 'react';
import { Modal } from '@/components/Dialogs/Modal';

interface ErrorDialogProps {
  message: string;
  onClose: () => void;
}

export function ErrorDialog({ message, onClose }: ErrorDialogProps) {
  return (
    <Modal
      title="エラー"
      onClose={onClose}
      width={420}
      footer={
        <button onClick={onClose} style={okButton}>
          OK
        </button>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--c-danger)', whiteSpace: 'pre-wrap' }}>{message}</div>
    </Modal>
  );
}

const okButton: CSSProperties = {
  padding: '7px 16px',
  background: 'var(--c-danger)',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer',
};
