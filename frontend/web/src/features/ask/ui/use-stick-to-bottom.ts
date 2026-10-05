import { useCallback, useEffect, useRef } from "react";

/**
 * 跟随底部，但用户往回看时让开。
 *
 * 原来的写法是每次消息变化就 `scrollIntoView({ behavior: "smooth" })`。流式回答每来
 * 一个增量就重新触发一次平滑滚动动画，动画互相打断；而且它不判断用户有没有上滑，
 * 想往回看一眼，下一个 token 就把你拽回底部。
 *
 * 规则和阅读器那边（assistant-ui 的 autoScroll）保持一致:
 *
 * - 贴着底部时才跟随；
 * - 用户一往上滚就停止跟随，直到他自己滚回底部；
 * - 流式期间用 `auto` 而不是 `smooth`——增量来得比动画快，平滑只会让它抖。
 */

/** 距底多少像素内仍算「贴着底部」。留一点余量，免得亚像素误差让跟随失效。 */
const BOTTOM_THRESHOLD_PX = 48;

export function useStickToBottom(
  containerRef: { current: HTMLElement | null },
  changeKey: unknown,
  { streaming = false }: { streaming?: boolean } = {},
): void {
  const pinnedRef = useRef(true);

  const isNearBottom = useCallback((node: HTMLElement) => (
    node.scrollHeight - node.scrollTop - node.clientHeight <= BOTTOM_THRESHOLD_PX
  ), []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const onScroll = () => {
      pinnedRef.current = isNearBottom(node);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    // 初始状态按当前位置判定，而不是假设贴底——切回已有会话时内容可能已经很长。
    pinnedRef.current = isNearBottom(node);
    return () => node.removeEventListener("scroll", onScroll);
  }, [containerRef, isNearBottom]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !pinnedRef.current) return;
    node.scrollTo({ top: node.scrollHeight, behavior: streaming ? "auto" : "smooth" });
  }, [containerRef, changeKey, streaming]);
}
