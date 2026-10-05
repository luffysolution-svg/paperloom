// ReaderFab 菜单开合：外点关闭 + Escape 关闭。
// 从 ReaderFab.tsx 抽出，主组件只组合行为。

import { useCallback, useEffect, useState, type RefObject } from "react";

export type UseReaderFabMenuResult = {
  open: boolean;
  setOpen: (next: boolean) => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

export function useReaderFabMenu(
  rootRef: RefObject<HTMLElement | null>,
): UseReaderFabMenuResult {
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef]);

  return { open, setOpen, closeMenu, toggleMenu };
}
