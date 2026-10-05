// 引用 [n] 的悬停预览卡：那一页的缩略图 + 已有的 snippet。
//
// 不引 Radix HoverCard 之类的浮层库：reader 包还要被 Electron 打包，依赖面要小
// （同包 AnswerChart.tsx 手写 SVG 也是这个理由）。这里只要固定定位 + 边缘翻转，
// 定位算术已经抽到 shared/ai/hover-card-position.ts。

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildPagePreviewUrl,
  hydrateProtectedImages,
  resolveCitationPageIdx,
  revokeHydratedImageUrls,
  type AiCitationLike,
} from "../../shared/ai/answer-enhance.js";
import {
  computeHoverCardPosition,
  type HoverCardPosition,
} from "../../shared/ai/hover-card-position.js";

/** 缩略图按 width=240 取（后端对该参数的下限也正好是 240）。 */
const PREVIEW_WIDTH = 240;
const SNIPPET_MAX = 180;

type ImageState = "none" | "loading" | "ready" | "failed";

export type CitationHoverCardProps = {
  citation: AiCitationLike;
  jobId: string;
  anchor: HTMLElement | null;
  cardId: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

function clip(text: string, max: number): string {
  const value = `${text || ""}`.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

/**
 * 卡片有没有东西可显示。
 *
 * jobId 拿不到时 `buildPagePreviewUrl` 返回空串——主页的 citation 常常没有
 * `job_id`。这种情况**不出破图也不出占位框**，只出文字 snippet：一个永远加载不出来
 * 的灰框比没有图更吵，而 snippet 本身就是用户悬停时最想看的东西。图和文字都没有
 * 就干脆不开卡片（调用方据此决定还要不要挂 hover）。
 */
export function citationPreviewKinds(
  citation: AiCitationLike,
  jobId: string,
): string[] {
  const pageIdx = resolveCitationPageIdx(citation);
  if (pageIdx === null) return [];
  const job = `${citation.job_id || jobId || ""}`.trim();
  if (!job) return [];
  // 译文 PDF 没产出的 job（只跑过 OCR）取 translated 会 404，退回取原文页。
  return ["translated", "source"];
}

export function citationHoverHasContent(
  citation: AiCitationLike,
  jobId: string,
): boolean {
  return citationPreviewKinds(citation, jobId).length > 0
    || clip(`${citation.snippet || ""}`, SNIPPET_MAX).length > 0;
}

export function CitationHoverCard({
  citation,
  jobId,
  anchor,
  cardId,
  onPointerEnter,
  onPointerLeave,
}: CitationHoverCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const kinds = citationPreviewKinds(citation, jobId);
  const pageIdx = resolveCitationPageIdx(citation);
  const pageNumber = pageIdx === null ? null : pageIdx + 1;
  const snippet = clip(`${citation.snippet || ""}`, SNIPPET_MAX);
  const [imageState, setImageState] = useState<ImageState>(
    kinds.length ? "loading" : "none",
  );
  const [position, setPosition] = useState<HoverCardPosition | null>(null);

  // 受保护资源：<img src> 直连会 401，走 fetchProtected → blob（与正文图片同一条
  // 路子，见 answer-enhance 的 hydrateProtectedImages）。卸载时必须回收 blob URL。
  useEffect(() => {
    const image = imageRef.current;
    if (!image || !kinds.length) return undefined;
    const job = `${citation.job_id || jobId || ""}`.trim();
    const controller = new AbortController();
    void (async () => {
      for (const kind of kinds) {
        const url = buildPagePreviewUrl(
          job,
          pageIdx ?? 0,
          kind as "translated" | "source",
          {},
        );
        if (!url) break;
        image.setAttribute("data-ai-src", url);
        image.classList.remove("is-missing");
        await hydrateProtectedImages(image, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!image.classList.contains("is-missing")) {
          setImageState("ready");
          return;
        }
      }
      if (!controller.signal.aborted) setImageState("failed");
    })();
    return () => {
      controller.abort();
      revokeHydratedImageUrls(image);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citation, jobId, pageIdx, kinds.length]);

  // 定位：固定定位 + 视口边缘翻转。图片加载完卡片会变高，所以 imageState 也要重算。
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !anchor) return undefined;
    const reposition = () => {
      const rect = anchor.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      const next = computeHoverCardPosition(
        { top: rect.top, left: rect.left, bottom: rect.bottom, width: rect.width },
        {
          width: box.width || card.offsetWidth,
          height: box.height || card.offsetHeight,
        },
        { width: window.innerWidth || 0, height: window.innerHeight || 0 },
      );
      // 滚动时每一帧都 setState 会白白重渲染；位置没变就不动。
      setPosition((current) => (
        current
          && current.left === next.left
          && current.top === next.top
          && current.placement === next.placement
          ? current
          : next
      ));
    };
    reposition();
    // 滚动要用捕获：正文在阅读器里是内层滚动容器，滚动事件不冒泡到 window。
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [anchor, imageState, snippet]);

  const body = (
    <div
      ref={cardRef}
      id={cardId}
      role="tooltip"
      className={`reader-ai-citation-card${position ? " is-placed" : ""}`}
      data-placement={position?.placement || "bottom"}
      style={{ left: `${position?.left ?? 0}px`, top: `${position?.top ?? 0}px` }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      {kinds.length ? (
        <div className="reader-ai-citation-card-figure" data-state={imageState}>
          <img
            ref={imageRef}
            alt={pageNumber ? `第 ${pageNumber} 页预览` : "来源页预览"}
            className="reader-ai-citation-card-thumb"
            decoding="async"
            width={PREVIEW_WIDTH}
          />
          {imageState === "failed" ? (
            <span className="reader-ai-citation-card-thumb-fallback">预览暂不可用</span>
          ) : null}
        </div>
      ) : null}
      <div className="reader-ai-citation-card-text">
        <div className="reader-ai-citation-card-head">
          {pageNumber ? `第 ${pageNumber} 页` : "来源"}
        </div>
        {snippet ? (
          <p className="reader-ai-citation-card-snippet">{snippet}</p>
        ) : null}
      </div>
    </div>
  );

  // portal 到 body：正文祖先里随便一个 transform / overflow: hidden 都会把
  // position: fixed 的卡片裁掉（阅读器的分栏和主页的问答流里都有）。
  const host = typeof document === "undefined" ? null : document.body;
  if (!host) return body;
  return createPortal(body, host);
}
