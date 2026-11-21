/** 一个面板的「开着吗 / 挂载了吗」—— 面板 id 只写一次。
 *
 * ## 为什么不是两个各写一遍
 *
 * 原来阅读页里长这样：
 *
 *     const favoritesMounted = useMountedSinceFirstOpen(assistantPanel === "favorites");
 *     …
 *     {favoritesMounted ? <ReaderFavoritesPanel open={assistantPanel === "favorites"} …/> : null}
 *
 * 同一个 id 抄了两遍，而这两遍**各自都是合法的**。把闸上那个写成别的面板
 * （抄改时最容易犯的错）：
 *
 *     const favoritesMounted = useMountedSinceFirstOpen(assistantPanel === "markdown");
 *
 * tsc 零报错，整套 2049 条测试全绿 —— 复查时实测过。而表现是：
 * `useMountedSinceFirstOpen` 是单调 latch，favoritesMounted 只有在「这一页曾经
 * 开过 Markdown」之后才为真，所以新开一页点「摘录」什么都不显示。这正是
 * 「tab 在、点了打不开」那一类缺陷，也正是上一次提交声称修掉的那一类。
 *
 * 收成一个 id 之后，这类抄改不再「两边各对一半」：写错就是某个 id 出现两次、
 * 另一个一次都不出现，清单对账那条门禁直接红（见
 * tests/reader/reader-single-launcher.test.mjs）。
 *
 * ## mounted 对不懒加载的面板也成立
 *
 * 批注 / AI 批注不 lazy，只用 `.open`。它们照样走这个 hook —— 五个面板同一种
 * 写法，门禁才能一把对账，不用先分出「哪些是懒的」。
 */
import { useMountedSinceFirstOpen } from "../../shared/react/use-mounted-since-first-open.js";
import type { ReaderAssistantPanel } from "../../shared/types/reader-assistant-panels.js";

export type ReaderPanelSlot = {
  open: boolean;
  /** 曾经打开过 —— 懒加载面板拿它决定要不要留在树上。 */
  mounted: boolean;
};

export function useReaderPanelSlot(
  active: ReaderAssistantPanel | null,
  id: ReaderAssistantPanel,
): ReaderPanelSlot {
  const open = active === id;
  return { open, mounted: useMountedSinceFirstOpen(open) };
}
