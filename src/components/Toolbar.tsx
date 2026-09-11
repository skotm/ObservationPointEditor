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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        rowGap: 10,
        padding: '10px 16px',
        background: 'var(--c-bg-1)',
        borderBottom: '1px solid var(--c-separator)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 4,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 0.1,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: 'var(--c-accent)',
            boxShadow: '0 0 8px var(--c-accent)',
            display: 'inline-block',
          }}
        />
        ObservationPointEditor
        {isDirty && (
          <span
            className="mono"
            style={{
              color: 'var(--c-label-tertiary)',
              fontWeight: 500,
              fontSize: 11,
              background: 'var(--c-bg-3)',
              borderRadius: 'var(--radius-pill)',
              padding: '2px 8px',
            }}
          >
            未保存の変更
          </span>
        )}
      </div>

      <ButtonGroup>
        <Btn onClick={onNewFile}>新規</Btn>
        <Btn onClick={() => jsonInput.current?.click()}>JSON を開く</Btn>
        <Btn onClick={() => kmopInput.current?.click()}>KMOP を開く</Btn>
        <Btn onClick={onSaveJson} variant="primary">JSON 保存</Btn>
        <Btn onClick={onSaveKmop}>KMOP 保存</Btn>
      </ButtonGroup>

      <ButtonGroup>
        <Btn onClick={() => csvInput.current?.click()}>NIED CSV 取り込み</Btn>
        <Btn onClick={onConsolidate}>重複統合</Btn>
      </ButtonGroup>

      <ButtonGroup>
        <Btn onClick={onDetectUnassigned} disabled={!hasBackground}>未割当ピクセル検出</Btn>
        <Btn onClick={onDetectTransparent} disabled={!hasBackground}>透明ピクセル検出</Btn>
      </ButtonGroup>

      <ButtonGroup>
        <Btn onClick={() => imgInput.current?.click()}>背景画像を開く</Btn>
        <Btn onClick={onLoadBackgroundFromKmoni}>kmoniから取得</Btn>
        <Btn onClick={onLoadBackgroundFromUmishiru}>海しるから取得</Btn>
      </ButtonGroup>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <Btn onClick={onUndo} disabled={!canUndo} aria-label="元に戻す">
          ↺ 元に戻す
        </Btn>
        <Btn onClick={onRedo} disabled={!canRedo} aria-label="やり直す">
          ↻ やり直す
        </Btn>
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

/** 関連するボタンを1つの丸みを帯びたグループとして視覚的にまとめる (HIGのセグメント化に近い表現) */
function ButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        background: 'var(--c-bg-2)',
        border: '1px solid var(--c-separator)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {children}
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
      className={variant === 'primary' ? 'btn btn-primary' : 'btn'}
      style={{ borderRadius: 'var(--radius-sm)' }}
    >
      {children}
    </button>
  );
}
