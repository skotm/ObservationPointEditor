import type { ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/**
 * HIG のトグルスイッチに寄せたコンポーネント。
 * タップ領域が44px以上確保されるようにしており、タッチ操作でも押しやすい。
 */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div
      className="toggle-row"
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {label && <div style={{ fontSize: 13, color: 'var(--c-label)' }}>{label}</div>}
        {description && (
          <div style={{ fontSize: 11, color: 'var(--c-label-tertiary)', lineHeight: 1.4 }}>{description}</div>
        )}
      </div>
      <span className="toggle" data-checked={checked}>
        <span className="toggle-knob" />
      </span>
    </div>
  );
}
