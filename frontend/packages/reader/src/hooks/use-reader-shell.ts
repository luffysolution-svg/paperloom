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

/** 「还没量到」用 0 表示，不是一个看起来合理的假数字。
 *
 * 这里原来是 `useState(960)`。提交顺序是死的：
 *
 *   commit 1  Grid 用 shellWidth=960 渲染 → pageWidthBasis 由 960 推出来；
 *             bindShell 在 ref 挂载阶段 setShellEl(node)，但本轮 RO effect 的
 *             闭包里 shellEl 还是 null，直接 return，从没量过。
 *   同一轮    PdfDocumentPane 的宽度 effect 跑：lastWidthRef 是 0 →
 *             resolveReaderWidthCommit 返回 "immediate" → **把 960 推出来的
 *             宽度当权威值提交**，并把 lastWidthRef 写成它。
 *   commit 3  RO 挂上、量到真实宽度。
 *   commit 4  新基准到达，而 lastWidthRef 已是非 0 的假值 → 判成 "settle" →
 *             排 200ms 定时器。
 *
 * 于是在任何不是 960px 宽的阅读区（几乎所有屏）：第一次画出来的 PDF 尺寸是错的
 * （1920 屏上约为正确宽度的一半），200ms 后整页跳一次。
 * resolveReaderWidthCommit 的「第一次立刻给、只有变化才等稳定」被这个假种子
 * 用在了错的那一次上。
 *
 * 用 0：调用方据此知道「还没量到」，把 pageWidthOverride 交回给
 * PdfDocumentPane 自己去量 scrollRoot，于是第一次提交就是一次真实测量。
 */
const UNMEASURED_SHELL_WIDTH = 0;

export function useReaderShell(): ReaderShellApi {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellEl, setShellEl] = useState<HTMLElement | null>(null);
  const [shellWidth, setShellWidth] = useState(UNMEASURED_SHELL_WIDTH);

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
