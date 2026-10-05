// elapsed 派生：独立秒表 hook 的薄封装（elapsed 故意不进 statusCardStore）。

import { useElapsedTicker } from "../useElapsedTicker.js";
import type { StatusCardSnapshot } from "../../domain/status-card-store.js";
import type { StatusCardElapsed } from "./types.js";

export function useStatusCardElapsed(snapshot: StatusCardSnapshot): StatusCardElapsed {
  return useElapsedTicker(snapshot.job, { finishedAtFallback: "" }) as StatusCardElapsed;
}
