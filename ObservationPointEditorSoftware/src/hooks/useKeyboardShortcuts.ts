import { useEffect } from 'react';

export interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onArrowMove?: (dx: number, dy: number, fine: boolean) => void;
}

/** 仕様書 2.3.4 のキーボードショートカット群 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }
      if (isMod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }
      if (isEditingText) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handlers.onDelete?.();
        return;
      }
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }
      const arrowMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (e.key in arrowMap) {
        e.preventDefault();
        const [dx, dy] = arrowMap[e.key];
        handlers.onArrowMove?.(dx, dy, e.shiftKey);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}
