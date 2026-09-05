import type { ReactNode } from 'react';
import { useRef } from 'react';

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
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        background: 'var(--c-bg-1)',
        borderBottom: '1px solid var(--c-border)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontWeight: 700, marginRight: 12, letterSpacing: 0.5 }}>
        <span style={{ color: 'var(--c-accent)' }}>●</span> ObservationPointEditor
        {isDirty && <span style={{ color: 'var(--c-text-2)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>未保存の変更あり</span>}
      </div>

      <Btn onClick={onNewFile}>新規</Btn>
      <Btn onClick={() => jsonInput.current?.click()}>JSON を開く</Btn>
      <Btn onClick={() => kmopInput.current?.click()}>KMOP を開く</Btn>
      <Btn onClick={onSaveJson}>JSON 保存</Btn>
      <Btn onClick={onSaveKmop}>KMOP 保存</Btn>

      <Divider />

      <Btn onClick={() => csvInput.current?.click()}>NIED CSV 取り込み</Btn>
      <Btn onClick={onConsolidate}>重複統合</Btn>

      <Divider />

      <Btn onClick={onDetectUnassigned} disabled={!hasBackground}>未割当ピクセル検出</Btn>
      <Btn onClick={onDetectTransparent} disabled={!hasBackground}>透明ピクセル検出</Btn>

      <Divider />

      <Btn onClick={() => imgInput.current?.click()}>背景画像を開く</Btn>
      <Btn onClick={onLoadBackgroundFromKmoni}>kmoniから取得</Btn>
      <Btn onClick={onLoadBackgroundFromUmishiru}>海しるから取得</Btn>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <Btn onClick={onUndo} disabled={!canUndo}>↺ 元に戻す</Btn>
        <Btn onClick={onRedo} disabled={!canRedo}>↻ やり直す</Btn>
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

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 10px',
        background: 'var(--c-bg-2)',
        border: '1px solid var(--c-border)',
        borderRadius: 4,
        color: disabled ? 'var(--c-text-2)' : 'var(--c-text-0)',
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--c-border)', margin: '0 4px' }} />;
}
