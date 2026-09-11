import type { ReactNode } from 'react';
import type { CommonObservationPoint } from '@/types';
import { TYPE_LABEL } from '@/utils/formatters';
import { TYPE_MARKER_COLOR } from '@/utils/shindoColorScale';

interface DataGridPanelProps {
  points: CommonObservationPoint[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function DataGridPanel({ points, selectedCode, onSelect }: DataGridPanelProps) {
  return (
    <div
      style={{
        height: 220,
        borderTop: '1px solid var(--c-separator)',
        background: 'var(--c-bg-1)',
        overflowY: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, background: 'var(--c-bg-1)', zIndex: 1 }}>
            <Th>種別</Th>
            <Th>コード</Th>
            <Th>名称</Th>
            <Th>地域</Th>
            <Th>緯度</Th>
            <Th>経度</Th>
            <Th>ピクセル座標</Th>
            <Th>状態</Th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => {
            const isSelected = p.code === selectedCode;
            return (
              <tr
                key={p.code}
                onClick={() => onSelect(p.code)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'var(--c-bg-3)' : 'transparent',
                  borderBottom: '1px solid var(--c-separator)',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--c-bg-2)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Td>
                  <span style={{ color: TYPE_MARKER_COLOR[p.type] }}>●</span> {TYPE_LABEL[p.type]}
                </Td>
                <Td className="mono">{p.code}</Td>
                <Td>{p.name}</Td>
                <Td>{p.region}</Td>
                <Td className="mono">{p.location.latitude.toFixed(5)}</Td>
                <Td className="mono">{p.location.longitude.toFixed(5)}</Td>
                <Td className="mono">
                  {p.point ? `${p.point.center.x + p.point.offset.x}, ${p.point.center.y + p.point.offset.y}` : '未設定'}
                </Td>
                <Td>
                  {p.isSuspended ? (
                    <span style={{ color: 'var(--c-suspended)' }}>停止中</span>
                  ) : (
                    <span style={{ color: 'var(--c-green)' }}>運用中</span>
                  )}
                </Td>
              </tr>
            );
          })}
          {points.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--c-label-tertiary)' }}>
                表示する観測点がありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '9px 12px',
        color: 'var(--c-label-tertiary)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: 0.02,
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--c-separator)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }} className={className}>
      {children}
    </td>
  );
}
