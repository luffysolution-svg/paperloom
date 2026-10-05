import { type ReactElement } from "react";
import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
import type { ReaderToolId } from "../../tools/registry.js";
/** FAB 菜单里的工具 id：除注册表工具外，批注由 FAB 直接开合本地面板。 */
export type ReaderFabToolId = ReaderToolId | "notes";
export type ReaderFabProps = {
    /** 当前打开的工具 id；null 表示都关 */
    activeTool: ReaderFabToolId | null;
    /** 本批注数量，用于工具项 badge */
    noteCount: number;
    /** 无 job 时为 true；缺省从 reader context 取 controller.sourceOnly（不是 sourceViewOnly） */
    sourceOnly?: boolean;
    onToggleTool: (id: ReaderFabToolId) => void;
    /** 缺省时从 reader context 取 controller.download */
    download?: ReaderDownloadContext;
};
export declare function ReaderFab(props: ReaderFabProps): ReactElement;
//# sourceMappingURL=ReaderFab.d.ts.map