export type HoverPlacement = "top" | "bottom";
/** DOMRect 的只读子集——测试里可以直接用字面量，不必造真 DOM。 */
export type HoverAnchorRect = {
    top: number;
    left: number;
    bottom: number;
    width: number;
};
export type HoverCardSize = {
    width: number;
    height: number;
};
export type HoverViewport = {
    width: number;
    height: number;
};
export type HoverCardPosition = {
    left: number;
    top: number;
    placement: HoverPlacement;
};
/** 触发点与卡片之间留的缝。 */
export declare const HOVER_CARD_GAP = 8;
/** 卡片与视口边缘之间留的余量。 */
export declare const HOVER_CARD_MARGIN = 8;
/**
 * 算出固定定位（position: fixed）下卡片左上角该放哪儿。
 *
 * - 默认开在触发点下方；
 * - 下方塞不下、而上方空间更大时翻到上方（这就是「边缘翻转」）；
 * - 横向以触发点中心对齐，再夹回视口内，保证贴着左右边的 [n] 也看得全。
 */
export declare function computeHoverCardPosition(anchor: HoverAnchorRect, card: HoverCardSize, viewport: HoverViewport, { gap, margin }?: {
    gap?: number;
    margin?: number;
}): HoverCardPosition;
//# sourceMappingURL=hover-card-position.d.ts.map