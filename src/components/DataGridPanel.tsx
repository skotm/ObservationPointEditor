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
        borderTop: '1px solid var(--c-separator-strong)',
        background: 'var(--c-bg-2)',
        overflowY: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
                  cursor: 'cell',
                  background: isSelected ? 'var(--c-bg-3)' : 'var(--c-bg-2)',
                  outline: isSelected ? '1.5px solid var(--c-blue)' : 'none',
                  outlineOffset: '-1.5px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f5f9fd';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--c-bg-2)';
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
        padding: '6px 10px',
        color: 'var(--c-label)',
        fontWeight: 700,
        fontSize: 11.5,
        background: 'var(--c-bg-1)',
        border: '1px solid var(--c-separator-strong)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td
      style={{ padding: '5px 10px', whiteSpace: 'nowrap', border: '1px solid var(--c-separator)' }}
      className={className}
    >
      {children}
    </td>
  );
}
