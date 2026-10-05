// ReaderFab 拖拽定位：localStorage 持久化 + 边缘夹取 + 指针拖动。
// 从 ReaderFab.tsx 抽出，主组件只组合行为。

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type FabPos = { x: number; y: number };

const STORAGE_KEY = "retainpdf.reader.fab.pos.v1";
const FAB_SIZE = 52;
const EDGE = 12;
const DRAG_THRESHOLD = 6;

export function clampFabPos(x: number, y: number): FabPos {
  if (typeof window === "undefined") {
    return { x, y };
  }
  const maxX = Math.max(EDGE, window.innerWidth - FAB_SIZE - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - FAB_SIZE - EDGE);
  return {
    x: Math.min(maxX, Math.max(EDGE, x)),
    y: Math.min(maxY, Math.max(EDGE, y)),
  };
}

export function defaultFabPos(): FabPos {
  if (typeof window === "undefined") {
    return { x: 24, y: 120 };
  }
  return clampFabPos(
    window.innerWidth - FAB_SIZE - 20,
    window.innerHeight - FAB_SIZE - 88,
  );
}

export function loadFabPos(): FabPos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFabPos();
    const parsed = JSON.parse(raw) as Partial<FabPos>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampFabPos(parsed.x, parsed.y);
    }
  } catch {
    /* ignore */
  }
  return defaultFabPos();
}

export function saveFabPos(pos: FabPos): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export function isFabMenuOpenUp(pos: FabPos): boolean {
  return typeof window !== "undefined" && pos.y > window.innerHeight * 0.55;
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

export type UseReaderFabPositionOptions = {
  /** 越过拖动阈值、真正开始拖动时触发（用于关菜单） */
  onDragStart?: () => void;
  /** 指针抬起但未拖动时触发（用于开合菜单） */
  onActivate?: () => void;
};

export function useReaderFabPosition(options: UseReaderFabPositionOptions = {}) {
  const { onDragStart, onActivate } = options;
  const [pos, setPos] = useState<FabPos>(() => loadFabPos());
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const onResize = () => setPos((p) => clampFabPos(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      onDragStart?.();
    }
    setPos(clampFabPos(drag.originX + dx, drag.originY + dy));
  }, [onDragStart]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (drag.moved) {
      setPos((p) => {
        const next = clampFabPos(p.x, p.y);
        saveFabPos(next);
        return next;
      });
      return;
    }
    onActivate?.();
  }, [onActivate]);

  return {
    pos,
    openUp: isFabMenuOpenUp(pos),
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
