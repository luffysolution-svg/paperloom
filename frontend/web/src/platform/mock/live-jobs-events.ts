// live mock job 的事件列表：由当前 payload 快照投影出一条 stage_progress。

import { buildLiveMockJobPayload } from "./live-jobs-shared.js";

export function buildLiveMockJobEvents(jobId?: string | null, nowMs = Date.now()) {
  const payload = buildLiveMockJobPayload(jobId, nowMs);
  if (!payload) return { items: [] as unknown[] };

  const progress = (payload.progress || {}) as {
    current?: number;
    total?: number;
    unit?: string;
  };
  const items = [
    {
      seq: 1,
      ts: payload.timestamps?.created_at || new Date(nowMs).toISOString(),
      level: "info",
      stage: payload.stage,
      stage_detail: payload.stage_detail,
      event_type: "stage_progress",
      event: "stage_progress",
      message: payload.stage_detail,
      progress_current: progress.current,
      progress_total: progress.total,
      progress_unit: progress.unit,
      display_stage: payload.display_stage,
      lane: "main",
      payload: {
        origin: "mock-live",
        job_id: payload.job_id,
        rerun_from_stage: (payload as { rerun_from_stage?: string }).rerun_from_stage,
      },
    },
  ];
  return { items };
}
