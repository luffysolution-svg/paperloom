import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JobListItemView } from "@retainpdf/contracts/job-status";
import {
  Activity,
  Ban,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { TaskRow } from "./TaskRow.js";
import { useTaskCenterAutoRefresh } from "./use-task-center-discovery.js";
import {
  groupTaskCenterJobs,
  taskCenterCounts,
  taskIdentity,
  type TaskCenterGroupKey,
} from "../domain/model.js";
import {
  cancelTaskCenterJob,
  loadTaskCenterJobs,
  loadTaskCenterLiveJobs,
  mergeTaskCenterJobs,
  retryTaskCenterJob,
  TASK_CENTER_MAX_ITEMS,
} from "../domain/task-center-api.js";
import { isActiveJobStatus } from "@retainpdf/domain/job";

const GROUP_ICONS = {
  running: Activity,
  queued: Clock3,
  failed: TriangleAlert,
  completed: CheckCircle2,
  canceled: Ban,
} satisfies Record<TaskCenterGroupKey, typeof Activity>;

export type TaskCenterOpenBookDetailInput = {
  job_id?: string;
  display_name?: string;
  source_file_name?: string;
  workflow?: string;
  [key: string]: unknown;
};

export type TaskCenterProps = {
  /** 点任务卡片打开书籍详情：由页面接到自己的图书馆动作上。 */
  onOpenBookDetail: (input: TaskCenterOpenBookDetailInput) => void;
};

export function TaskCenter({ onOpenBookDetail }: TaskCenterProps) {
  const [items, setItems] = useState<JobListItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reachedLimit, setReachedLimit] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busyByJob, setBusyByJob] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);
  const requestInFlightRef = useRef(false);
  // 列表请求进行中又要求整页刷新（比如重试建了新任务）时记一笔，等这次请求结束再刷，不能直接丢掉。
  const reloadQueuedRef = useRef(false);
  const liveInFlightRef = useRef(false);

  const itemsRef = useRef<JobListItemView[]>([]);
  const nextOffsetRef = useRef(0);
  const generationRef = useRef(0);

  const refreshLive = useCallback(async () => {
    if (liveInFlightRef.current) return;
    const generation = generationRef.current;
    liveInFlightRef.current = true;
    try {
      const live = await loadTaskCenterLiveJobs(itemsRef.current);
      if (!mountedRef.current || generation !== generationRef.current) return;
      // Only update cards still present; a late response must not resurrect
      // another page or a task removed by a refresh.
      const ids = new Set(itemsRef.current.map((item) => item.job_id));
      const merged = mergeTaskCenterJobs(itemsRef.current, live.filter((item) => ids.has(item.job_id)));
      itemsRef.current = merged;
      setItems(merged);
    } catch {
      // Keep the persisted summaries visible; the next active poll retries.
    } finally {
      liveInFlightRef.current = false;
    }
  }, []);

  const load = useCallback(async ({ append = false }: { append?: boolean } = {}): Promise<void> => {
    if (requestInFlightRef.current) {
      if (!append) reloadQueuedRef.current = true;
      return;
    }
    requestInFlightRef.current = true;
    setRefreshing(true);
    generationRef.current += 1;
    try {
      const result = await loadTaskCenterJobs(undefined, { offset: append ? nextOffsetRef.current : 0 });
      if (!mountedRef.current) return;
      const next = append ? mergeTaskCenterJobs(itemsRef.current, result.items) : result.items;
      itemsRef.current = next;
      nextOffsetRef.current = result.nextOffset;
      setItems(next);
      setHasMore(result.hasMore);
      setReachedLimit(Boolean(result?.reachedLimit));
      setError("");
      void refreshLive();
    } catch (cause) {
      if (!mountedRef.current) return;
      setError(cause instanceof Error ? cause.message : "读取任务失败，请稍后重试。");
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      if (reloadQueuedRef.current && mountedRef.current) {
        reloadQueuedRef.current = false;
        void load();
      }
    }
  }, [refreshLive]);

  // 只刷新一条任务，已经翻过的页留着。取消之后用它：整页重拉会退回第一页。
  const refreshJob = useCallback(async (job: JobListItemView) => {
    const generation = generationRef.current;
    const [fresh] = await loadTaskCenterLiveJobs([job]);
    if (!fresh || !mountedRef.current || generation !== generationRef.current) return;
    if (!itemsRef.current.some((item) => item.job_id === fresh.job_id)) return;
    const merged = mergeTaskCenterJobs(itemsRef.current, [fresh]);
    itemsRef.current = merged;
    setItems(merged);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; generationRef.current += 1; };
  }, [load]);

  const hasActiveTasks = items.some((job) => isActiveJobStatus(job.status));
  useTaskCenterAutoRefresh({
    itemsRef, nextOffsetRef, generationRef, mountedRef, setItems, hasActiveTasks, refreshLive,
    listInFlightRef: requestInFlightRef });

  const groups = useMemo(() => groupTaskCenterJobs(items), [items]);
  const counts = useMemo(() => taskCenterCounts(items), [items]);

  function setBusy(jobId: string, action = "") {
    setBusyByJob((current) => ({ ...current, [jobId]: action }));
  }

  function handleOpen(job: JobListItemView) {
    // Book detail consumes the library projection, while /jobs returns a task
    // projection. Only bridge fields present in both contracts; notably do not
    // manufacture a document_id for a job list row.
    onOpenBookDetail({
      job_id: job.job_id,
      display_name: job.display_name,
      source_file_name: job.source_file_name || undefined,
      workflow: job.workflow,
      status: job.status,
      page_count: job.page_count,
      cover_url: job.cover_url || undefined,
      thumbnail_url: job.thumbnail_url || undefined,
      created_at: job.created_at,
      updated_at: job.updated_at,
      prefer_translate_tab: true,
    });
  }

  async function handleCancel(job: JobListItemView) {
    setBusy(job.job_id, "cancel");
    try {
      await cancelTaskCenterJob(job);
      toast.success("已提交取消请求");
      await refreshJob(job);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "取消失败，请稍后重试。");
    } finally {
      if (mountedRef.current) setBusy(job.job_id);
    }
  }

  async function handleRetry(job: JobListItemView) {
    setBusy(job.job_id, "retry");
    try {
      await retryTaskCenterJob(job.job_id);
      toast.success("已创建恢复任务");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "重试失败，请稍后重试。");
    } finally {
      if (mountedRef.current) setBusy(job.job_id);
    }
  }

  return (
    <section id="task-center-view" className="mx-auto flex h-full w-full max-w-6xl flex-col px-5 pb-28 pt-5" aria-label="任务中心">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">任务中心</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">PDF 处理任务</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {reachedLimit
              ? `当前已加载最近 ${TASK_CENTER_MAX_ITEMS} 条，达到前端安全上限。`
              : `当前加载 ${items.length} 条${hasMore ? "，可继续加载更多" : ""}；每次处理按独立任务展示。`}
          </p>
        </div>
        <button
          id="task-center-refresh-btn"
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
          disabled={refreshing}
          onClick={() => void load()}
        >
          <RefreshCw className={`size-4${refreshing ? " animate-spin" : ""}`} />
          刷新
        </button>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-6" aria-label="当前加载范围任务计数">
        {([
          ["全部", counts.total],
          ["运行中", counts.running],
          ["排队中", counts.queued],
          ["失败", counts.failed],
          ["已完成", counts.completed],
          ["已取消", counts.canceled],
        ] as const).map(([label, count]) => (
          <div key={label} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
            <div className="text-lg font-semibold text-foreground">{count}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> 正在读取任务…
        </div>
      ) : error && items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <TriangleAlert className="size-7 text-muted-foreground" />
          <p className="text-sm text-foreground">{error}</p>
          <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void load()}>重新加载</button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Clock3 className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">暂无处理任务</p>
          <p className="text-xs text-muted-foreground">上传 PDF 并执行 OCR 或翻译后，任务会出现在这里。</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {error ? <div className="mb-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">刷新失败：{error}</div> : null}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {groups.map((group) => {
              const Icon = GROUP_ICONS[group.key];
              return (
                <section key={group.key} className="rounded-3xl border border-border/70 bg-muted/35 p-3" aria-labelledby={`task-group-${group.key}`}>
                  <header className="flex items-center justify-between px-1 pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <h2 id={`task-group-${group.key}`} className="text-sm font-semibold text-foreground">{group.label}</h2>
                    </div>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{group.items.length}</span>
                  </header>
                  {group.items.length ? (
                    <div className="space-y-2">
                      {group.items.map((job) => (
                        <TaskRow
                          key={taskIdentity(job)}
                          job={job}
                          busyAction={busyByJob[job.job_id] || ""}
                          onOpen={handleOpen}
                          onCancel={(target) => void handleCancel(target)}
                          onRetry={(target) => void handleRetry(target)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">暂无{group.label}任务</div>
                  )}
                </section>
              );
            })}
          </div>
          {hasMore ? (
            <div className="flex justify-center py-4">
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
                disabled={refreshing} onClick={() => void load({ append: true })}>
                {refreshing ? "加载中…" : "加载更多任务"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
