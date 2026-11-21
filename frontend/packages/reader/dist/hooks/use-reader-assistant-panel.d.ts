import { loadReaderViewState } from "../shared/state/reader-view-state.js";
import { type ReaderAssistantPanel } from "../shared/types/reader-assistant-panels.js";
export type ReaderAssistantPanelState = {
    /** 这个面板值属于哪个 viewStateKey。 */
    scope: string;
    panel: ReaderAssistantPanel | null;
};
export type ReaderAssistantPanelUpdate = ReaderAssistantPanel | null | ((prev: ReaderAssistantPanel | null) => ReaderAssistantPanel | null);
/** 重开阅读页时该恢复哪个面板 —— **只看存下来的东西**。
 *
 * 当前会话 mode 刻意不是输入：面板开合和左右分栏是两件正交的事。把当前
 * mode 掺进来正是病 1 的成因。
 */
export declare function resolveInitialAssistantPanel(saved: ReturnType<typeof loadReaderViewState>): ReaderAssistantPanel | null;
/**
 * 这里**没有** boot / ready 闸。原来那个 `if (boot.loading) return` 是拿来防
 * 「还没恢复就先写」的，而 scope 绑进 state 之后那件事在结构上已经不可能发生 ——
 * 再留一道闸就是一段没有任何测试能弄红的代码。key 还是空串时
 * `saveReaderViewState` 自己就是空操作。
 */
export declare function useReaderAssistantPanel(viewStateKey: string): {
    panel: ReaderAssistantPanel | null;
    /** 面板值当前属于哪个 scope。调用方拿它来重置同样按 scope 作废的东西。 */
    scope: string;
    setPanel: (update: ReaderAssistantPanelUpdate) => void;
};
//# sourceMappingURL=use-reader-assistant-panel.d.ts.map