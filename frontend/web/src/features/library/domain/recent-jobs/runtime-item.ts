// recent-jobs 卡片运行时合并的装配/出口根。
// stage/snapshot 归一化拆到 runtime-stage-snapshot.ts，单卡合并规则拆到
// library-job-item-merge.ts；本文件保留对外的建卡 / 列表合并入口并转出全部类型。

import { sameLibraryCard } from "./library-card-identity.js";
import { firstNonEmpty } from "./runtime-value-helpers.js";
import { mergeLibraryJobItem } from "./library-job-item-merge.js";
import type {
  LibraryJobItem,
  RuntimeItemOptions,
} from "./runtime-item-types.js";

export type {
  LibraryJobItem,
  RuntimeItemOptions,
  RuntimeStatus,
  StageAdapterPort,
  StageProgress,
  StageSnapshot,
} from "./runtime-item-types.js";
export { buildRecentJobRuntimeSnapshot } from "./runtime-stage-snapshot.js";
export { mergeLibraryJobItem } from "./library-job-item-merge.js";

export function createLibraryJobItemFromRuntime(
  job: LibraryJobItem = {},
  { stageAdapterPort = {} }: RuntimeItemOptions = {},
): LibraryJobItem | null {
  // 前置：缺 job_id 建不出卡 -> null 早返；否则 queued 骨架打底再 merge（[I1] 裸提交即转圈）。
  const jobId = firstNonEmpty(job.job_id);
  if (!jobId) {
    return null;
  }
  return mergeLibraryJobItem({
    id: jobId,
    job_id: jobId,
    title: jobId,
    display_name: jobId,
    source_file_name: "",
    page_count: null,
    status: "queued",
    stage: "queued",
    stage_detail: "任务已提交",
    progress: {},
    created_at: job.created_at || new Date().toISOString(),
    updated_at: job.updated_at || new Date().toISOString(),
  }, job, { stageAdapterPort });
}

// 书目身份（标题 / 显示名）以服务端为准，补丁只在服务端还没有名字时兜底。
//
// 补丁表存的是**运行态**（status/stage/progress），这是它的正当职责——全量刷新
// 拿回来的服务端行可能比正在跑的任务旧，补丁把运行态盖回去是对的。但
// stampBookIdentity 会顺手把**当时卡片上的标题**也抄进补丁；那是一张快照，
// 之后用户改名、或任务成功后 documentAutoNaming 让后端改了标题，服务端已是新名，
// 补丁里还是旧名。
//
// 而 mergeLibraryJobItem 的 pickBookTitle 规则是「next（补丁）非占位符就赢」，
// 于是每次全量刷新都把新名盖回旧名。实测路径：改名 → patchLibraryDocumentItem
// 乐观写（标题变新）→ 同一函数 void reload → commitRecentJobsPage → 本函数
// → 标题闪一下又变回去。
//
// 补丁表只在换 job_id 时删旧键，终态不清、卸载不清，所以这张旧快照会一直在。
// 但即便它被及时清理，「补丁生成之后才发生的改名」仍然会被盖——所以修在这里
// （剥掉越权的身份字段），而不是修清理时机。
function withServerOwnedIdentity(
  patch: LibraryJobItem,
  serverItem: LibraryJobItem,
): LibraryJobItem {
  if (!firstNonEmpty(serverItem.title, serverItem.display_name)) {
    // 服务端还没有名字（比如刚建卡）：保留补丁的兜底身份。
    return patch;
  }
  const { title: _title, display_name: _displayName, ...rest } = patch;
  return rest as LibraryJobItem;
}

export function mergeRuntimePatches(
  items: LibraryJobItem[] | null | undefined,
  patches: Map<string, LibraryJobItem>,
  { stageAdapterPort = {} }: RuntimeItemOptions = {},
): LibraryJobItem[] {
  // 前置：items 可空按 []；patches 为空直接返回原序浅拷贝（早返，不改行为）。
  const list = Array.isArray(items) ? items : [];
  const patchList = patches ? Array.from(patches.values()) : [];
  if (patchList.length === 0) {
    return [...list];
  }
  return list.map((item) => {
    const patch = patchList.find((candidate) => sameLibraryCard(candidate, item)) || null;
    // 早返：无命中补丁 -> 原样返回（终态/运行态都不动）。
    if (!patch) {
      return item;
    }
    // 命中：用 patch 的 job_id 覆盖（重试后书架仍是原位原书）// [I3]
    return mergeLibraryJobItem(item, {
      ...withServerOwnedIdentity(patch, item),
      job_id: firstNonEmpty(patch.job_id, item.job_id),
      active_job_id: firstNonEmpty(patch.active_job_id, patch.job_id, item.active_job_id),
      library_only: false,
    }, { stageAdapterPort });
  });
}
