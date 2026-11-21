import type {
  ReaderLiveTranslationCommitEvent as LiveTranslationCommitEvent,
  ReaderLiveTranslationItem as LiveTranslationItem,
  ReaderLiveTranslationLayout as LiveTranslationLayout,
  ReaderLiveTranslationLayoutPage as LiveTranslationLayoutPage,
  ReaderLiveTranslationPageSnapshot as LiveTranslationPageSnapshot,
} from "../../contracts/live-translation.js";

export type LiveTranslationPageState = {
  attempt: number;
  generation: number;
  pageHash: string;
  itemsById: ReadonlyMap<string, LiveTranslationItem>;
  /** Last authoritative SSE seq that changed this item; used only as an animation key. */
  changedAtSeqById: ReadonlyMap<string, number>;
  lastEventSeq: number;
};

export type LiveTranslationState = {
  layoutByPage: ReadonlyMap<number, LiveTranslationLayoutPage>;
  pagesByPage: ReadonlyMap<number, LiveTranslationPageState>;
  lastSeq: number;
  connection: "idle" | "connecting" | "live" | "reconnecting" | "terminal" | "unavailable";
  /** Authoritative task status supplied by the Reader session. */
  jobStatus: string;
  /** Human-readable transport/capability failure. Never contains translated content. */
  error: string;
};

export const EMPTY_LIVE_TRANSLATION_STATE: LiveTranslationState = {
  layoutByPage: new Map(),
  pagesByPage: new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: "",
};

export function layoutPageMap(layout: LiveTranslationLayout): ReadonlyMap<number, LiveTranslationLayoutPage> {
  return new Map((layout?.pages || []).map((page) => [page.page_idx, page]));
}

export type SnapshotDecision = "accept" | "ignore" | "retry";

function compareVersion(
  left: Pick<LiveTranslationPageState | LiveTranslationPageSnapshot, "attempt" | "generation">,
  right: Pick<LiveTranslationPageState | LiveTranslationPageSnapshot, "attempt" | "generation">,
): number {
  if (left.attempt !== right.attempt) return left.attempt < right.attempt ? -1 : 1;
  if (left.generation !== right.generation) return left.generation < right.generation ? -1 : 1;
  return 0;
}

/**
 * Decide against the event first, then against the already rendered page.
 * A newer snapshot is valid because the immutable page endpoint may have advanced
 * again between the SSE hint and this read.
 */
export function decideLiveTranslationSnapshot(
  current: LiveTranslationPageState | undefined,
  event: LiveTranslationCommitEvent,
  snapshot: LiveTranslationPageSnapshot,
): SnapshotDecision {
  if (snapshot.page_idx !== event.page_idx) return "retry";
  const againstEvent = compareVersion(snapshot, event);
  if (againstEvent < 0) return "retry";
  if (againstEvent === 0 && snapshot.page_hash !== event.page_hash) return "retry";
  if (!current) return "accept";
  const againstCurrent = compareVersion(snapshot, current);
  if (againstCurrent < 0) return "ignore";
  if (againstCurrent === 0) {
    // 同版本、hash 对不上 → **以后端为准**，不能 retry。
    //
    // 走到这一行时快照已经过了对事件的全部校验（版本不低于事件，且同版本时
    // hash 与事件一致），也就是后端给的就是权威答案。而 retry 会去重读**同一个
    // 不可变端点** 9 次（SNAPSHOT_RETRY_MS 累计 8.2s），后端那三个字段来自同一行
    // DB 记录，9 次的答案必然完全相同 —— 这条 retry 在物理上不可能成功。
    //
    // 代价是实打实的：那 8.2 秒里 onEvent 被 await 堵着，**后面所有页的译文一起
    // 停**；9 次之后放弃这一页并推进 lastSeq，而重连用 afterSeq，这个事件再也不会
    // 被重放 —— 该页于本次会话内永久停在旧版本。
    return snapshot.page_hash === current.pageHash ? "ignore" : "accept";
  }
  return "accept";
}

export function applyLiveTranslationSnapshot(
  state: LiveTranslationState,
  event: LiveTranslationCommitEvent,
  snapshot: LiveTranslationPageSnapshot,
): LiveTranslationState {
  if (event.seq <= state.lastSeq) return state;
  const current = state.pagesByPage.get(event.page_idx);
  const decision = decideLiveTranslationSnapshot(current, event, snapshot);
  if (decision === "retry") return state;
  if (decision === "ignore") {
    return { ...state, lastSeq: event.seq, connection: "live", error: "" };
  }
  const itemsById = new Map(snapshot.items.map((item) => [item.item_id, item]));
  const changedAtSeqById = new Map(current?.changedAtSeqById || []);
  for (const itemId of event.changed_item_ids) {
    if (itemsById.has(itemId)) changedAtSeqById.set(itemId, event.seq);
  }
  const pagesByPage = new Map(state.pagesByPage);
  pagesByPage.set(event.page_idx, {
    attempt: snapshot.attempt,
    generation: snapshot.generation,
    pageHash: snapshot.page_hash,
    itemsById,
    changedAtSeqById,
    lastEventSeq: event.seq,
  });
  return {
    ...state,
    pagesByPage,
    lastSeq: event.seq,
    connection: "live",
    error: "",
  };
}

/** 实时译文叠层的开关分布在两处，这里是那个分布的唯一真源。
 *
 * - 顶栏 pill（ReaderWorkspaceTabs 的 liveTranslation）：兼报状态（N 页 /
 *   重连中），任务进终态后只剩一句永久的「已完成」，所以终态不给。
 * - 源文栏内的「译文」按钮（ReaderAppReactPdf 的 sourcePaneAction）：只要源文
 *   栏在台面上就在，它贴着叠层落地的那一栏。
 *
 * 收掉顶栏 pill 的前提是第二个开关接得住 —— 这个函数存在就是为了让那句话可测，
 * 见 reader-one-ai-door.test.mjs 的「叠层画得出来，就一定至少有一个开关够得着」。
 *
 * # 两处曾经写错的地方（都被 subagent 审查抓出来）
 *
 * 1. 注释里写的是「见 overlayToggleAlwaysReachable」，而那个名字**全仓不存在**
 *    —— 写注释时凭印象编了个英文名，没回头核。
 * 2. `overlayRenderable` 号称「叠层此刻是否真的会画到屏幕上」，实际算的是
 *    `hasOverlayContent && showSource`，漏了 liveTranslationVisible 和
 *    assistantOpen。穷举 96 种组合，**有 24 行它在撒谎**（返回 true 而叠层一行
 *    都没画）。于是那条不变式测试守的是一个名不副实的条件。
 *
 * 现在它按 overlayOnSource 的真实条件算（见 resolveReaderPaneComposition）。
 */
export type LiveTranslationToggles = {
  /** 顶栏那个带状态文字的 pill */
  topBarPill: boolean;
  /** 源文栏内部那个「译文」按钮 */
  sourcePaneToggle: boolean;
  /** 叠层此刻是否**真的会画到屏幕上**。名字说什么就得是什么 —— 它曾经只算
   * 「有内容 + 源文栏在台面上」，96 种组合里有 24 行在撒谎。 */
  overlayRenderable: boolean;
};

export function resolveLiveTranslationToggles(input: {
  hasOverlayContent: boolean;
  connection: LiveTranslationState["connection"];
  showSource: boolean;
  /** 用户开着叠层没有。不看它，overlayRenderable 就是在说「有内容」而不是
   * 「在画」。 */
  liveTranslationVisible: boolean;
  /** 辅助面板开着时叠层被抑制（resolveReaderPaneComposition 的 overlayOnSource
   * 里那条 `&& !assistantOpen`）。 */
  assistantOpen: boolean;
}): LiveTranslationToggles {
  const { hasOverlayContent, connection, showSource } = input;
  return {
    topBarPill: hasOverlayContent && connection !== "terminal",
    sourcePaneToggle: hasOverlayContent && showSource,
    // 和 resolveReaderPaneComposition 的 overlayOnSource 同一套条件，外加
    // 「源文栏得在台面上」——否则叠层没有落脚的地方。
    overlayRenderable: hasOverlayContent
      && showSource
      && input.liveTranslationVisible
      && !input.assistantOpen,
  };
}
