// 正文里的 [n] 角标：点击跳页（原有行为），悬停出预览卡（新增）。

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  resolveCitationPageNumber,
  type AiCitationLike,
} from "../../shared/ai/answer-enhance.js";
import { CitationHoverCard, citationHoverHasContent } from "./CitationHoverCard.js";

/** 开合延迟：开得太快会在阅读时乱闪，关得太快则从 [n] 挪到卡片上的路上就没了。 */
export const HOVER_OPEN_DELAY_MS = 140;
export const HOVER_CLOSE_DELAY_MS = 180;

export type CitationRefProps = {
  citation: AiCitationLike;
  label: string;
  jobId: string;
  onJump?: (citation: AiCitationLike) => void;
};

export function CitationRef({ citation, label, jobId, onJump }: CitationRefProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardId = `reader-ai-citation-card-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const pageNumber = resolveCitationPageNumber(citation);
  const hoverable = citationHoverHasContent(citation, jobId);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback((next: boolean, delay: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOpen(next);
    }, delay);
  }, [clearTimer]);

  // 卸载时清掉待触发的定时器，否则已卸载的组件还会 setState。
  useEffect(() => () => clearTimer(), [clearTimer]);

  // 引用内容换了（重新流式渲染、切会话）就把卡片收掉，避免显示上一条的页。
  useEffect(() => {
    if (!hoverable) setOpen(false);
  }, [hoverable]);

  const openNow = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);
  const closeNow = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="reader-ai-citation-ref"
        data-page={pageNumber ?? undefined}
        aria-describedby={open ? cardId : undefined}
        aria-expanded={hoverable ? open : undefined}
        title={pageNumber ? `跳到第 ${pageNumber} 页` : "定位来源"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeNow();
          onJump?.(citation);
        }}
        onMouseEnter={hoverable ? () => schedule(true, HOVER_OPEN_DELAY_MS) : undefined}
        onMouseLeave={hoverable ? () => schedule(false, HOVER_CLOSE_DELAY_MS) : undefined}
        onFocus={hoverable ? openNow : undefined}
        onBlur={hoverable ? closeNow : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            closeNow();
          }
        }}
      >
        [{label}]
      </button>
      {open && hoverable ? (
        <CitationHoverCard
          citation={citation}
          jobId={jobId}
          anchor={anchorRef.current}
          cardId={cardId}
          onPointerEnter={openNow}
          onPointerLeave={() => schedule(false, HOVER_CLOSE_DELAY_MS)}
        />
      ) : null}
    </>
  );
}
