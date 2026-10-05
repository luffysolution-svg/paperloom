import { useCallback, useEffect, useState } from "react";

/**
 * 在线程里选中一段文字时，浮出一个「引用」按钮。
 *
 * 只认落在线程容器**内部**的选区：页面别处（侧栏标题、输入框）的选择不该弹按钮。
 * 选区一变、一滚动、一点别处就收起——浮层跟着旧坐标飘是最烦人的那种 bug。
 */

export type QuoteSelection = {
  text: string;
  /** 视口坐标（position: fixed 直接用）。 */
  left: number;
  top: number;
};

function readSelection(container: HTMLElement | null): QuoteSelection | null {
  if (!container) return null;
  const selection = globalThis.getSelection?.();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const text = `${selection.toString() || ""}`.trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  // 整个选区都要在线程里。跨出去的（比如从回答一路拖到输入框）不接。
  if (!container.contains(range.commonAncestorContainer)) return null;

  const rect = range.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return null;

  return { text, left: rect.left + rect.width / 2, top: rect.top };
}

export function useQuoteSelection(
  containerRef: { current: HTMLElement | null },
): { selection: QuoteSelection | null; clear: () => void } {
  const [selection, setSelection] = useState<QuoteSelection | null>(null);

  const clear = useCallback(() => {
    setSelection(null);
    try {
      globalThis.getSelection?.()?.removeAllRanges();
    } catch {
      /* 某些环境下没有 Selection，收起浮层就够了 */
    }
  }, []);

  useEffect(() => {
    const sync = () => setSelection(readSelection(containerRef.current));
    // selectionchange 在拖选过程中会连发，等鼠标/键盘放开再读，免得按钮跟着光标跳。
    const onPointerUp = () => globalThis.setTimeout?.(sync, 0);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.shiftKey || event.key.startsWith("Arrow")) sync();
    };
    const onScrollOrResize = () => setSelection(null);

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keyup", onKeyUp);
    // 滚动容器在内部，捕获阶段才收得到它的 scroll。
    document.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [containerRef]);

  return { selection, clear };
}
