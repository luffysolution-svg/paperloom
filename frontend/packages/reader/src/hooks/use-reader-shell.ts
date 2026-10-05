// 阅读器外壳尺寸：合并 shellRef + shellEl state + ResizeObserver。
// bindShell 同时写 ref（同步读）与 state（驱动重渲 / 挂观察器）。

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type ReaderShellApi = {
  shellRef: RefObject<HTMLDivElement | null>;
  /** same node as shellRef.current; state for children that need re-render when mounted */
  shellEl: HTMLElement | null;
  shellWidth: number;
  bindShell: (node: HTMLDivElement | null) => void;
};

const MIN_SHELL_WIDTH = 160;
const WIDTH_CHANGE_THRESHOLD = 8;
const DEFAULT_SHELL_WIDTH = 960;

export function useReaderShell(): ReaderShellApi {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellEl, setShellEl] = useState<HTMLElement | null>(null);
  const [shellWidth, setShellWidth] = useState(DEFAULT_SHELL_WIDTH);

  const bindShell = useCallback((node: HTMLDivElement | null) => {
    shellRef.current = node;
    setShellEl(node);
  }, []);

  useEffect(() => {
    const shell = shellEl;
    if (!shell || typeof ResizeObserver === "undefined") {
      return;
    }

    const apply = (w: number) => {
      if (!Number.isFinite(w) || w < MIN_SHELL_WIDTH) {
        return;
      }
      setShellWidth((prev) => {
        if (Math.abs(prev - w) < WIDTH_CHANGE_THRESHOLD) {
          return prev;
        }
        return w;
      });
    };

    const ro = new ResizeObserver((entries) => {
      apply(entries[0]?.contentRect?.width ?? shell.clientWidth);
    });
    ro.observe(shell);
    apply(shell.clientWidth);
    return () => ro.disconnect();
  }, [shellEl]);

  return {
    shellRef,
    shellEl,
    shellWidth,
    bindShell,
  };
}
