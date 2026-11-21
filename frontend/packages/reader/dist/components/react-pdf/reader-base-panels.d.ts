import type { LucideIcon } from "lucide-react";
import { type ReaderBasePanelId } from "../../shared/types/reader-assistant-panels.js";
export type ReaderBasePanelSpec = {
    id: ReaderBasePanelId;
    /** dock 展开时 tab 上的文字。 */
    label: string;
    /** dock 收起时侧边竖条上的缩写。 */
    short: string;
    Icon: LucideIcon;
    /** 没有任务（纯本地 PDF）时这个面板是空的，tab 禁用并说明原因。
     *
     * 这条行为原来只活在 FAB 的菜单行里（"需打开任务阅读"），dock 的 tab 没有。
     * 合并启动器时把更有信息量的那一份留下来 —— 点开一个空面板比点不动更糟。
     */
    needsJob: boolean;
};
/** 顺序来自 id 清单，不是这张表的字面量顺序 —— 清单才是真源。 */
export declare const READER_BASE_PANELS: readonly ReaderBasePanelSpec[];
//# sourceMappingURL=reader-base-panels.d.ts.map