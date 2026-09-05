import type { CSSProperties, ReactNode } from 'react';
import type { CommonObservationPoint, FilterState, TypeStats } from '@/types';
import { TYPE_LABEL } from '@/utils/formatters';

interface LeftPanelProps {
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  stats: TypeStats;
  filteredCount: number;
  totalCount: number;
  selectedPoint: CommonObservationPoint | null;
  onPatchSelected: (patch: Partial<CommonObservationPoint>) => void;
  onAddPoint: () => void;
  onDeleteSelected: () => void;
}

export function LeftPanel({
  filter,
  onFilterChange,
  stats,
  filteredCount,
  totalCount,
  selectedPoint,
  onPatchSelected,
  onAddPoint,
  onDeleteSelected,
}: LeftPanelProps) {
  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        background: 'var(--c-bg-1)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <Section title="検索・フィルター">
        <input
          type="text"
          placeholder="コード・名前・地域で検索"
          value={filter.searchText}
          onChange={(e) => onFilterChange({ ...filter, searchText: e.target.value })}
          style={{ width: '100%', marginBottom: 10 }}
        />
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={filter.showKNet}
            onChange={(e) => onFilterChange({ ...filter, showKNet: e.target.checked })}
          />
          <span style={{ color: 'var(--c-knet)' }}>●</span> K-NET
          <span style={countStyle}>{stats.kNet}</span>
        </label>
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={filter.showKiKNet}
            onChange={(e) => onFilterChange({ ...filter, showKiKNet: e.target.checked })}
          />
          <span style={{ color: 'var(--c-kiknet)' }}>●</span> KiK-net
          <span style={countStyle}>{stats.kikNet}</span>
        </label>
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={filter.showSNet}
            onChange={(e) => onFilterChange({ ...filter, showSNet: e.target.checked })}
          />
          <span style={{ color: 'var(--c-snet)' }}>●</span> S-net
          <span style={countStyle}>{stats.sNet}</span>
        </label>
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={filter.showSuspended}
            onChange={(e) => onFilterChange({ ...filter, showSuspended: e.target.checked })}
          />
          <span style={{ color: 'var(--c-suspended)' }}>●</span> 運用停止も表示
          <span style={countStyle}>{stats.suspended}</span>
        </label>
        <div className="mono" style={{ marginTop: 8, fontSize: 12, color: 'var(--c-text-2)' }}>
          {filteredCount} / {totalCount} 件表示中
        </div>
      </Section>

      <Section title="観測点の操作">
        <button style={primaryButton} onClick={onAddPoint}>
          + 新規観測点を追加
        </button>
        {selectedPoint && (
          <button style={dangerButton} onClick={onDeleteSelected}>
            選択中の観測点を削除
          </button>
        )}
      </Section>

      {selectedPoint ? (
        <Section title={`編集中: ${selectedPoint.code}`}>
          <Field label="種別">
            <select
              value={selectedPoint.type}
              onChange={(e) => onPatchSelected({ type: e.target.value as CommonObservationPoint['type'] })}
              style={{ width: '100%' }}
            >
              <option value="k_net">{TYPE_LABEL.k_net}</option>
              <option value="kik_net">{TYPE_LABEL.kik_net}</option>
              <option value="s_net">{TYPE_LABEL.s_net}</option>
            </select>
          </Field>
          <Field label="観測点コード">
            <input
              type="text"
              value={selectedPoint.code}
              onChange={(e) => onPatchSelected({ code: e.target.value })}
              style={{ width: '100%' }}
              className="mono"
            />
          </Field>
          <Field label="名称">
            <input
              type="text"
              value={selectedPoint.name}
              onChange={(e) => onPatchSelected({ name: e.target.value })}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label="地域">
            <input
              type="text"
              value={selectedPoint.region}
              onChange={(e) => onPatchSelected({ region: e.target.value })}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label="緯度 / 経度">
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                step="0.00001"
                value={selectedPoint.location.latitude}
                onChange={(e) =>
                  onPatchSelected({
                    location: { ...selectedPoint.location, latitude: Number(e.target.value) },
                  })
                }
                className="mono"
                style={{ width: '50%' }}
              />
              <input
                type="number"
                step="0.00001"
                value={selectedPoint.location.longitude}
                onChange={(e) =>
                  onPatchSelected({
                    location: { ...selectedPoint.location, longitude: Number(e.target.value) },
                  })
                }
                className="mono"
                style={{ width: '50%' }}
              />
            </div>
          </Field>
          <Field label="読み取りピクセル座標 (center)">
            {selectedPoint.point ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  value={selectedPoint.point.center.x}
                  onChange={(e) =>
                    onPatchSelected({
                      point: {
                        center: { ...selectedPoint.point!.center, x: Number(e.target.value) },
                        offset: selectedPoint.point!.offset,
                      },
                    })
                  }
                  className="mono"
                  style={{ width: '50%' }}
                />
                <input
                  type="number"
                  value={selectedPoint.point.center.y}
                  onChange={(e) =>
                    onPatchSelected({
                      point: {
                        center: { ...selectedPoint.point!.center, y: Number(e.target.value) },
                        offset: selectedPoint.point!.offset,
                      },
                    })
                  }
                  className="mono"
                  style={{ width: '50%' }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--c-text-2)', fontSize: 12 }}>
                地図上でクリックすると座標が設定されます
              </div>
            )}
          </Field>
          {selectedPoint.point && (
            <Field label="補正オフセット (offset)">
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  value={selectedPoint.point.offset.x}
                  onChange={(e) =>
                    onPatchSelected({
                      point: {
                        center: selectedPoint.point!.center,
                        offset: { ...selectedPoint.point!.offset, x: Number(e.target.value) },
                      },
                    })
                  }
                  className="mono"
                  style={{ width: '50%' }}
                />
                <input
                  type="number"
                  value={selectedPoint.point.offset.y}
                  onChange={(e) =>
                    onPatchSelected({
                      point: {
                        center: selectedPoint.point!.center,
                        offset: { ...selectedPoint.point!.offset, y: Number(e.target.value) },
                      },
                    })
                  }
                  className="mono"
                  style={{ width: '50%' }}
                />
              </div>
            </Field>
          )}
          <label style={checkboxRow}>
            <input
              type="checkbox"
              checked={selectedPoint.isSuspended}
              onChange={(e) => onPatchSelected({ isSuspended: e.target.checked })}
            />
            運用停止中
          </label>
        </Section>
      ) : (
        <div style={{ padding: 16, color: 'var(--c-text-2)', fontSize: 13 }}>
          地図上の観測点をクリックすると詳細を編集できます。
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--c-border)', padding: '14px 16px' }}>
      <div style={{ fontSize: 12, letterSpacing: 0.3, color: 'var(--c-text-1)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--c-text-2)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const checkboxRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  marginBottom: 8,
  cursor: 'pointer',
};

const countStyle: CSSProperties = {
  marginLeft: 'auto',
  fontFamily: 'var(--font-mono)',
  color: 'var(--c-text-2)',
  fontSize: 12,
};

const primaryButton: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--c-accent)',
  color: '#1a0e05',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: 8,
};

const dangerButton: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'transparent',
  color: 'var(--c-danger)',
  border: '1px solid var(--c-danger)',
  borderRadius: 4,
  cursor: 'pointer',
};
