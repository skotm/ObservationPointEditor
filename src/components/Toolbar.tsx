import { useRef } from 'react';
import type { ReactNode } from 'react';

interface ToolbarProps {
  onNewFile: () => void;
  onOpenJson: (file: File) => void;
  onOpenKmop: (file: File) => void;
  onSaveJson: () => void;
  onSaveKmop: () => void;
  onImportCsv: (file: File, sourceFile: 'sitepub_kik_sj.csv' | 'sitepub_knet_sj.csv' | 'sitepub_snet_sj.csv') => void;
  onConsolidate: () => void;
  onDetectUnassigned: () => void;
  onDetectTransparent: () => void;
  onLoadBackgroundFromFile: (file: File) => void;
  onLoadBackgroundFromKmoni: () => void;
  onLoadBackgroundFromUmishiru: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  hasBackground: boolean;
}

export function Toolbar({
  onNewFile,
  onOpenJson,
  onOpenKmop,
  onSaveJson,
  onSaveKmop,
  onImportCsv,
  onConsolidate,
  onDetectUnassigned,
  onDetectTransparent,
  onLoadBackgroundFromFile,
  onLoadBackgroundFromKmoni,
  onLoadBackgroundFromUmishiru,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  hasBackground,
}: ToolbarProps) {
  const jsonInput = useRef<HTMLInputElement>(null);
  const kmopInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* タイトルバー相当: アプリ名と保存状態 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          background: 'var(--c-accent)',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        ObservationPointEditor
        {isDirty && (
          <span
            style={{
              fontWeight: 400,
              fontSize: 11,
              background: 'rgba(255,255,255,0.22)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 8px',
            }}
          >
            未保存の変更
          </span>
        )}
      </div>

      {/* リボン風ツールバー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          padding: '6px 8px',
          background: 'var(--c-bg-1)',
          borderBottom: '1px solid var(--c-separator-strong)',
          flexWrap: 'wrap',
          rowGap: 6,
        }}
      >
        <RibbonGroup label="ファイル">
          <Btn onClick={onNewFile}>新規</Btn>
          <Btn onClick={() => jsonInput.current?.click()}>JSON を開く</Btn>
          <Btn onClick={() => kmopInput.current?.click()}>KMOP を開く</Btn>
          <Btn onClick={onSaveJson} variant="primary">JSON 保存</Btn>
          <Btn onClick={onSaveKmop}>KMOP 保存</Btn>
        </RibbonGroup>

        <RibbonGroup label="データ">
          <Btn onClick={() => csvInput.current?.click()}>NIED CSV 取り込み</Btn>
          <Btn onClick={onConsolidate}>重複統合</Btn>
        </RibbonGroup>

        <RibbonGroup label="検証">
          <Btn onClick={onDetectUnassigned} disabled={!hasBackground}>未割当ピクセル検出</Btn>
          <Btn onClick={onDetectTransparent} disabled={!hasBackground}>透明ピクセル検出</Btn>
        </RibbonGroup>

        <RibbonGroup label="背景画像">
          <Btn onClick={() => imgInput.current?.click()}>画像を開く</Btn>
          <Btn onClick={onLoadBackgroundFromKmoni}>kmoniから取得</Btn>
          <Btn onClick={onLoadBackgroundFromUmishiru}>海しるから取得</Btn>
        </RibbonGroup>

        <RibbonGroup label="編集" style={{ marginLeft: 'auto' }}>
          <Btn onClick={onUndo} disabled={!canUndo} aria-label="元に戻す">
            ↺ 元に戻す
          </Btn>
          <Btn onClick={onRedo} disabled={!canRedo} aria-label="やり直す">
            ↻ やり直す
          </Btn>
        </RibbonGroup>
      </div>

      <input
        ref={jsonInput}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpenJson(f);
          e.target.value = '';
        }}
      />
      <input
        ref={kmopInput}
        type="file"
        accept=".kmop"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpenKmop(f);
          e.target.value = '';
        }}
      />
      <input
        ref={csvInput}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const name = f.name.toLowerCase();
            const sourceFile = name.includes('kik')
              ? 'sitepub_kik_sj.csv'
              : name.includes('snet') || name.includes('s_net')
                ? 'sitepub_snet_sj.csv'
                : 'sitepub_knet_sj.csv';
            onImportCsv(f, sourceFile);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={imgInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onLoadBackgroundFromFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Excelリボンのような、下部にラベルの付いたボタングループ */
function RibbonGroup({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '0 10px',
        borderRight: '1px solid var(--c-separator-strong)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>{children}</div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--c-label-tertiary)',
          textAlign: 'center',
          marginTop: 'auto',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary';
  'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={variant === 'primary' ? 'ribbon-btn ribbon-btn-primary' : 'ribbon-btn'}
    >
      {children}
    </button>
  );
}