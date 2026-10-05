// BookCard 纯格式化 helper（无 React 依赖）：日期与 memo 展示签名。
// 从 BookCard.tsx 机械拆出，行为不变。

import { formatZhDate } from "@/platform/utils/datetime.js";
import type { LibraryCardItem } from "../../../domain/types.js";

export function formatCardDate(value: string | null | undefined) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return formatZhDate(parsed);
}

/**
 * memo / 列表行共用：item 展示签名（命中才重渲）。
 * 身份：job_id/document_id/workflow/job_type/library_only/reading_status —— 决定点卡进详情还是切选中态。
 * 时间：updated_at —— 卡片副标题日期。
 * 状态三件套：status（后端终态 succeeded/failed/canceled/running…）/ stage（列表投影原生 stage，live.rs 无 display_stage）/ display_stage（轮询·lane 合并后的公开阶段）/ substage（阶段内细分）。
 * 进度：progress.*（顶层）+ runtime_status.progress.*（轮询快照）—— 驱动中央 loading 与底部进度条。
 * 展示：title/display_name/page_count/cover_url/thumbnail_url/stage_detail/runtime_status.detail —— 标题·页数·封面·副文案。
 */
export function cardSignatureOf(item: LibraryCardItem = {}) {
  const progress = item.progress && typeof item.progress === "object" ? item.progress : {};
  const runtimeProgress =
    item.runtime_status?.progress && typeof item.runtime_status.progress === "object"
      ? item.runtime_status.progress
      : {};
  return [
    item.job_id,
    item.document_id,
    item.workflow,
    item.job_type,
    item.library_only ? "lib" : "",
    item.reading_status,
    item.updated_at,
    item.status,
    item.runtime_pending,
    item.runtime_unavailable,
    item.stage,
    item.display_stage,
    item.substage,
    progress.current,
    progress.total,
    progress.percent,
    runtimeProgress.current,
    runtimeProgress.total,
    runtimeProgress.percent,
    item.title,
    item.display_name,
    item.page_count,
    item.cover_url,
    item.thumbnail_url,
    item.stage_detail,
    item.runtime_status?.detail,
  ]
    .map((value) => `${value ?? ""}`)
    .join("|");
}
