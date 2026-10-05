import { type RefObject } from "react";
export type UseReaderFabMenuResult = {
    open: boolean;
    setOpen: (next: boolean) => void;
    closeMenu: () => void;
    toggleMenu: () => void;
};
export declare function useReaderFabMenu(rootRef: RefObject<HTMLElement | null>): UseReaderFabMenuResult;
//# sourceMappingURL=use-reader-fab-menu.d.ts.map