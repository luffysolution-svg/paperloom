import { type PointerEvent as ReactPointerEvent } from "react";
export type FabPos = {
    x: number;
    y: number;
};
export declare function clampFabPos(x: number, y: number): FabPos;
export declare function defaultFabPos(): FabPos;
export declare function loadFabPos(): FabPos;
export declare function saveFabPos(pos: FabPos): void;
export declare function isFabMenuOpenUp(pos: FabPos): boolean;
export type UseReaderFabPositionOptions = {
    /** 越过拖动阈值、真正开始拖动时触发（用于关菜单） */
    onDragStart?: () => void;
    /** 指针抬起但未拖动时触发（用于开合菜单） */
    onActivate?: () => void;
};
export declare function useReaderFabPosition(options?: UseReaderFabPositionOptions): {
    pos: FabPos;
    openUp: boolean;
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};
//# sourceMappingURL=use-reader-fab-position.d.ts.map