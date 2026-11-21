import type { ReaderMode } from "./use-reader-session.js";
export type ReaderInitialMode = {
    /** 要切到的模式；null = 保持会话当前模式 */
    mode: ReaderMode | null;
    /** true = 窄屏自动默认，不是用户选的 */
    auto: boolean;
};
export declare function resolveReaderInitialMode(input: {
    savedMode: ReaderMode | undefined;
    sourceViewOnly: boolean;
    viewportWidth: number;
}): ReaderInitialMode;
/** 当前 mode 是否该写进存档：仍停在自动默认上时不写。 */
export declare function shouldPersistReaderMode(mode: ReaderMode, autoMode: ReaderMode | null): boolean;
//# sourceMappingURL=reader-initial-mode.d.ts.map