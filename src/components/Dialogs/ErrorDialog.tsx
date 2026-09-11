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
        <button onClick={onClose} className="btn btn-danger">
          OK
        </button>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--c-red)', whiteSpace: 'pre-wrap' }}>{message}</div>
    </Modal>
  );
}

