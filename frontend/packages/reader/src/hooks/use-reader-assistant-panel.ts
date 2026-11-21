/** 阅读页「开着哪个辅助面板」的恢复与持久化。
 *
 * ## 为什么单独成一个 hook
 *
 * 这件事的 bug 全在 **effect 的执行顺序**上，而不在某个判断写错。这类东西源码
 * 门禁看不出来、纯函数测试也看不出来，只有真渲染才测得到 —— 单独成 hook 就是
 * 为了能被真渲染。同样的理由见 use-reader-annotations.ts 顶上那段。
 *
 * ## 它治的两个病（都是实测确认的，不是推断）
 *
 * 1. **存了永远不恢复**：原来第一行是 `if (mode === "compare") return null`，
 *    判的是**当前**会话 mode。而有译文的书默认 mode 就是 "compare"，所以
 *    「只要这本书翻译过，存下来的面板必然被丢弃」。种一条
 *    `{mode:"compare", assistantPanel:"terminal"}` 再开阅读页：storage 里那条
 *    一直在，只是没人读。
 *
 * 2. **丢弃之后还会把它删掉**：种 `{mode:"translated", assistantPanel:"terminal"}`
 *    时实测到的时间线是 —— 恢复 mode 触发重渲染 → 持久化 effect 跟着跑 →
 *    把刚被丢弃的 null 写回 storage。不是「少恢复一次」，是删数据。
 *
 * ## 为什么 scope 和 panel 绑在同一份 state
 *
 * `viewStateKey` 在一次会话里会从 `job:J` 迁到 `document:D`（documentId 是异步
 * 到的，实测确认：anchor 落在 job 键，面板落在 document 键）。原来「恢复」和
 * 「保存」是同一个 effect 靠一个 ref 分叉的 —— 迁移那一帧 ref 已经更新、state
 * 还是上一个 scope 的值，于是把旧 scope 的面板写进新键。绑在一起之后，保存只
 * 认 state 自带的 scope。
 */
import { useCallback, useEffect, useState } from "react";

import {
  loadReaderViewState,
  saveReaderViewState,
} from "../shared/state/reader-view-state.js";
import {
  type ReaderAssistantPanel,
  isReaderAssistantPanel,
} from "../shared/types/reader-assistant-panels.js";

export type ReaderAssistantPanelState = {
  /** 这个面板值属于哪个 viewStateKey。 */
  scope: string;
  panel: ReaderAssistantPanel | null;
};

export type ReaderAssistantPanelUpdate =
  | ReaderAssistantPanel
  | null
  | ((prev: ReaderAssistantPanel | null) => ReaderAssistantPanel | null);

/** 重开阅读页时该恢复哪个面板 —— **只看存下来的东西**。
 *
 * 当前会话 mode 刻意不是输入：面板开合和左右分栏是两件正交的事。把当前
 * mode 掺进来正是病 1 的成因。
 */
export function resolveInitialAssistantPanel(
  saved: ReturnType<typeof loadReaderViewState>,
): ReaderAssistantPanel | null {
  // 认哪些 id 由 READER_ASSISTANT_PANEL_IDS 决定。原来在这儿抄了一份清单，
  // 加面板忘了补的表现是「重开阅读页丢面板」—— 不报错，也没有测试会红。
  if (isReaderAssistantPanel(saved?.assistantPanel)) {
    return saved.assistantPanel;
  }
  // 旧的「任意两栏」布局的一次性迁移。
  // 曾经有一条把 "ai" 迁过来的分支，AI 问答面板删掉之后它无处可去 —— 存着
  // 旧布局的人落回下面的 markdown 判断，再不中就是不开面板。比迁到终端好：
  // 恢复出一个用户没要过的 agent 会话比不恢复更意外。
  if (saved?.splitLayout?.left === "markdown" || saved?.splitLayout?.right === "markdown") {
    return "markdown";
  }
  return null;
}

/**
 * 这里**没有** boot / ready 闸。原来那个 `if (boot.loading) return` 是拿来防
 * 「还没恢复就先写」的，而 scope 绑进 state 之后那件事在结构上已经不可能发生 ——
 * 再留一道闸就是一段没有任何测试能弄红的代码。key 还是空串时
 * `saveReaderViewState` 自己就是空操作。
 */
export function useReaderAssistantPanel(viewStateKey: string): {
  panel: ReaderAssistantPanel | null;
  /** 面板值当前属于哪个 scope。调用方拿它来重置同样按 scope 作废的东西。 */
  scope: string;
  setPanel: (update: ReaderAssistantPanelUpdate) => void;
} {
  const [state, setState] = useState<ReaderAssistantPanelState>(() => ({
    scope: viewStateKey,
    panel: resolveInitialAssistantPanel(loadReaderViewState(viewStateKey)),
  }));

  // scope 变了：按**新 scope 存的东西**重新恢复。
  useEffect(() => {
    setState((prev) => (prev.scope === viewStateKey ? prev : {
      scope: viewStateKey,
      panel: resolveInitialAssistantPanel(loadReaderViewState(viewStateKey)),
    }));
  }, [viewStateKey]);

  // 写回：只写这份 state 自带的 scope，而且只在它已经追上当前 scope 之后。
  //
  // 这道闸挡的是**迁移那一帧**：恢复的 setState 只是排了一次重渲染，同一次提交里
  // 紧接着跑的就是这个 effect，此时 state 还是旧 scope 的值、viewStateKey 已经是
  // 新键。少了它，新键会先被旧 scope 的面板写一遍，下一帧才被改回来 —— 中间那一
  // 瞬间关掉页面，存下来的就是错的。所以测的是「新键有没有被写过错的值」，不是
  // 「最后一次写对不对」（最后那次靠重渲染兜着，永远是对的）。
  useEffect(() => {
    if (state.scope !== viewStateKey) return;
    saveReaderViewState(state.scope, {
      assistantPanel: state.panel,
      // 旧的自由两栏布局已经没有写入者了，恢复时只当迁移来源读一次。
      splitLayout: null,
    });
  }, [state, viewStateKey]);

  const setPanel = useCallback((update: ReaderAssistantPanelUpdate) => {
    setState((prev) => ({
      scope: prev.scope,
      panel: typeof update === "function" ? update(prev.panel) : update,
    }));
  }, []);

  return { panel: state.panel, scope: state.scope, setPanel };
}
