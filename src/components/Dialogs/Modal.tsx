import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, footer, width = 480 }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width,
          maxWidth: '92vw',
          maxHeight: '85vh',
          background: 'var(--c-bg-elevated)',
          border: '1px solid var(--c-separator-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Windows標準ダイアログ風のタイトルバー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--c-bg-1)',
            borderBottom: '1px solid var(--c-separator-strong)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 24,
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--c-label-secondary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e81123';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--c-label-secondary)';
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', background: 'var(--c-bg-2)' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--c-bg-1)',
              borderTop: '1px solid var(--c-separator)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
