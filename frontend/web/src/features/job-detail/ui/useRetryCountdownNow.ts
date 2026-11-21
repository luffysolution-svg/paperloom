import { useEffect, useState } from "react";

/**
 * OCR 队列繁忙时「N 秒后可重试」倒计时用的当前时间。每秒刷新一次，到点就停：
 * 以前到 0 以后定时器还在，每秒 setState 一次，面板不关就一直重渲。
 * resetKey 变了（换了任务）从头算。
 */
export function useRetryCountdownNow(retryAtMs: number | null, resetKey: unknown): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const start = Date.now();
    setNow(start);
    if (retryAtMs === null || start >= retryAtMs) return undefined;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= retryAtMs) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetKey, retryAtMs]);

  return now;
}
