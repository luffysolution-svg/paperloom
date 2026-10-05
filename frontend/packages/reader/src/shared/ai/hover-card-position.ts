// 悬浮卡定位：纯算术，不碰 DOM。
//
// 手写而不是引 floating-ui / radix：reader 包要被 Electron 一起打包，依赖越少越好
// （同包的 AnswerChart 也是同样的理由手写 SVG）。这里只需要「贴着触发点开、放不下
// 就翻边、横向别出视口」三件事，够用了。

export type HoverPlacement = "top" | "bottom";

/** DOMRect 的只读子集——测试里可以直接用字面量，不必造真 DOM。 */
export type HoverAnchorRect = {
  top: number;
  left: number;
  bottom: number;
  width: number;
};

export type HoverCardSize = { width: number; height: number };
export type HoverViewport = { width: number; height: number };

export type HoverCardPosition = {
  left: number;
  top: number;
  placement: HoverPlacement;
};

/** 触发点与卡片之间留的缝。 */
export const HOVER_CARD_GAP = 8;
/** 卡片与视口边缘之间留的余量。 */
export const HOVER_CARD_MARGIN = 8;

/**
 * 算出固定定位（position: fixed）下卡片左上角该放哪儿。
 *
 * - 默认开在触发点下方；
 * - 下方塞不下、而上方空间更大时翻到上方（这就是「边缘翻转」）；
 * - 横向以触发点中心对齐，再夹回视口内，保证贴着左右边的 [n] 也看得全。
 */
export function computeHoverCardPosition(
  anchor: HoverAnchorRect,
  card: HoverCardSize,
  viewport: HoverViewport,
  { gap = HOVER_CARD_GAP, margin = HOVER_CARD_MARGIN } = {},
): HoverCardPosition {
  const spaceBelow = viewport.height - anchor.bottom;
  const spaceAbove = anchor.top;
  const needed = card.height + gap + margin;
  const placement: HoverPlacement = spaceBelow >= needed || spaceBelow >= spaceAbove
    ? "bottom"
    : "top";

  const rawTop = placement === "bottom"
    ? anchor.bottom + gap
    : anchor.top - gap - card.height;
  // 上下都塞不下时（卡片比视口还高之类）夹回可视区，宁可盖住一点也别整张跑出屏幕。
  const maxTop = Math.max(margin, viewport.height - card.height - margin);
  const top = Math.min(Math.max(rawTop, margin), maxTop);

  const rawLeft = anchor.left + anchor.width / 2 - card.width / 2;
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const left = Math.min(Math.max(rawLeft, margin), maxLeft);

  return { left, top, placement };
}
