import { type RefObject } from "react";
export type ReaderShellApi = {
    shellRef: RefObject<HTMLDivElement | null>;
    /** same node as shellRef.current; state for children that need re-render when mounted */
    shellEl: HTMLElement | null;
    shellWidth: number;
    bindShell: (node: HTMLDivElement | null) => void;
};
export declare function useReaderShell(): ReaderShellApi;
//# sourceMappingURL=use-reader-shell.d.ts.map