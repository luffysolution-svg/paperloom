import type { ReactElement } from "react";
import type { ReaderAssistantPanel } from "./reader-assistant-types.js";
export type { ReaderAssistantPanel } from "./reader-assistant-types.js";
export type ReaderAssistantDockProps = {
    active: ReaderAssistantPanel | null;
    /** 缺省时从 reader context 的 assistant actions 取 */
    onSelect?: (panel: ReaderAssistantPanel) => void;
    onClose?: () => void;
};
/**
 * Markdown 和 AI 是阅读辅助工具，不参与 PDF 阅读模式的选择。
 * 关闭时只显示安静的右侧工具栏；打开后由 Dock 顶栏负责切换与关闭。
 */
export declare function ReaderAssistantDock(props: ReaderAssistantDockProps): ReactElement;
//# sourceMappingURL=ReaderAssistantDock.d.ts.map