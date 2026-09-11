import type { ReactNode } from 'react';
import type { CommonObservationPoint, FilterState, TypeStats } from '@/types';
import { TYPE_LABEL } from '@/utils/formatters';
import { Toggle } from '@/components/Toggle';

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
  decimalMode: boolean;
  onDecimalModeChange: (value: boolean) => void;
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
  decimalMode,
  onDecimalModeChange,
}: LeftPanelProps) {
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        background: 'var(--c-bg-1)',
        borderRight: '1px solid var(--c-separator)',
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
          style={{ width: '100%', marginBottom: 14 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FilterRow
            color="var(--c-knet)"
            label="K-NET"
            count={stats.kNet}
            checked={filter.showKNet}
            onChange={(v) => onFilterChange({ ...filter, showKNet: v })}
          />
          <FilterRow
            color="var(--c-kiknet)"
            label="KiK-net"
            count={stats.kikNet}
            checked={filter.showKiKNet}
            onChange={(v) => onFilterChange({ ...filter, showKiKNet: v })}
          />
          <FilterRow
            color="var(--c-snet)"
            label="S-net"
            count={stats.sNet}
            checked={filter.showSNet}
            onChange={(v) => onFilterChange({ ...filter, showSNet: v })}
          />
          <FilterRow
            color="var(--c-suspended)"
            label="運用停止も表示"
            count={stats.suspended}
            checked={filter.showSuspended}
            onChange={(v) => onFilterChange({ ...filter, showSuspended: v })}
          />
        </div>

        <div
          className="mono"
          style={{
            marginTop: 14,
            fontSize: 12,
            color: 'var(--c-label-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>表示中</span>
          <span>
            {filteredCount} / {totalCount} 件
          </span>
        </div>
      </Section>

      <Section title="観測点の操作">
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={onAddPoint}>
          ＋ 新規観測点を追加
        </button>
        {selectedPoint && (
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={onDeleteSelected}>
            選択中の観測点を削除
          </button>
        )}
      </Section>

      <Section title="座標設定">
        <Toggle
          checked={decimalMode}
          onChange={onDecimalModeChange}
          label="小数点モード"
          description={
            decimalMode
              ? '座標を0.1px単位で指定します'
              : '座標を整数(1px単位)で指定します'
          }
        />
      </Section>

      {selectedPoint ? (
        <Section title={`編集中 — ${selectedPoint.code}`}>
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
            <div style={{ display: 'flex', gap: 8 }}>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  value={selectedPoint.point.center.x}
                  step={decimalMode ? '0.1' : '1'}
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
                  step={decimalMode ? '0.1' : '1'}
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
              <div
                style={{
                  color: 'var(--c-label-tertiary)',
                  fontSize: 12,
                  background: 'var(--c-bg-2)',
                  border: '1px dashed var(--c-separator-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                }}
              >
                地図上でクリックすると座標が設定されます
              </div>
            )}
          </Field>
          {selectedPoint.point && (
            <Field label="補正オフセット (offset)">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  value={selectedPoint.point.offset.x}
                  step={decimalMode ? '0.1' : '1'}
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
                  step={decimalMode ? '0.1' : '1'}
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
          <Toggle
            checked={selectedPoint.isSuspended}
            onChange={(v) => onPatchSelected({ isSuspended: v })}
            label="運用停止中"
          />
        </Section>
      ) : (
        <div style={{ padding: '20px 20px', color: 'var(--c-label-tertiary)', fontSize: 13, lineHeight: 1.6 }}>
          地図上の観測点をクリックすると詳細を編集できます。
        </div>
      )}
    </div>
  );
}

function FilterRow({
  color,
  label,
  count,
  checked,
  onChange,
}: {
  color: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      label={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
              flex: 'none',
            }}
          />
          {label}
          <span className="mono" style={{ color: 'var(--c-label-tertiary)', fontSize: 11 }}>
            {count}
          </span>
        </span>
      }
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--c-separator)', padding: '18px 20px' }}>
      <div className="section-title" style={{ marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--c-label-tertiary)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
