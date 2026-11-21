// 任务中心的一行：文档名、流程、状态、进度，以及打开 / 取消 / 重试按钮。从 TaskCenter.tsx 拆出。
import type { JobListItemView } from "@retainpdf/contracts/job-status";
import { FileText, LoaderCircle, RotateCcw, Square } from "lucide-react";
import { isActiveJobStatus } from "@retainpdf/domain/job";
import { formatZhDateTime } from "@/platform/utils/datetime.js";
import {
  taskDocumentLabel,
  taskIdentity,
  taskProgressPercent,
  taskStatusLabel,
  taskWorkflowLabel,
} from "../domain/model.js";

function shortJobId(jobId: string): string {
  const value = `${jobId || ""}`.trim();
  return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return formatZhDateTime(date);
}

export function TaskRow({ job, busyAction, onOpen, onCancel, onRetry }: {
  job: JobListItemView;
  busyAction: string;
  onOpen: (job: JobListItemView) => void;
  onCancel: (job: JobListItemView) => void;
  onRetry: (job: JobListItemView) => void;
}) {
  const status = `${job.status || ""}`.trim().toLowerCase();
  const isActive = isActiveJobStatus(status);
  const progress = taskProgressPercent(job);
  const busy = Boolean(busyAction);

  return (
    <article
      className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
      data-task-id={taskIdentity(job)}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <FileText className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">文档</span>
            <h3 className="min-w-0 truncate text-sm font-semibold text-foreground" title={taskDocumentLabel(job)}>
              {taskDocumentLabel(job)}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>任务 <code title={job.job_id}>{shortJobId(job.job_id)}</code></span>
            <span>{taskWorkflowLabel(job)}</span>
            {job.updated_at ? <span>{formatUpdatedAt(job.updated_at)}</span> : null}
          </div>
          {isActive && progress !== null ? (
            <div className="mt-2 flex items-center gap-2" aria-label={`任务进度 ${Math.round(progress)}%`}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <span className="w-9 text-right text-[11px] text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
          {taskStatusLabel(job)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          onClick={() => onOpen(job)}
        >
          打开详情
        </button>
        {isActive ? (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            disabled={busy}
            onClick={() => onCancel(job)}
          >
            {busyAction === "cancel" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
            {busyAction === "cancel" ? "取消中" : "取消任务"}
          </button>
        ) : null}
        {status === "failed" ? (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
            disabled={busy}
            onClick={() => onRetry(job)}
          >
            {busyAction === "retry" ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            重试
          </button>
        ) : null}
      </div>
    </article>
  );
}
