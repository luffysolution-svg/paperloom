// 静默接入任务进度（书籍详情处理 Tab → bd-job-status-inner）。

import type { LibraryControllerDeps } from "../types.js";

/**
 * 静默接入任务进度：
 * - silent startPolling：只写 statusCardStore，不抬工作流区、不广播 create
 * - 绝不 dispatch openTranslationWorkflow（进度主场在详情，不在弹窗）
 * 前置条件：jobId 为非空、非 `doc:` 合成 id。
 *
 * 这里曾经还顺手 hideStatusArea()「强制关掉主状态区」。现在不再这么做：
 * 压住主页状态卡是 BookDetailDialog 的抑制闸（statusArea.setSuppressed）的职责，
 * 按「弹窗是否打开」整体生效。在这里 setVisible(false) 会把状态区的业务可见性
 * （desired）一并抹掉，等于让关掉弹窗后的主页再也看不到那份仍在跑的进度——
 * 而「未打开详情时靠主卡兜底看进度」正是它的正当用途。
 */
export function createAttachJobProgress({
  startPolling,
}: Pick<LibraryControllerDeps, "startPolling">) {
  return function attachJobProgress(
    jobId?: string | null,
    options: { recovering?: boolean } = {},
  ): void {
    const id = `${jobId || ""}`.trim();
    if (!id || id.startsWith("doc:")) {
      return;
    }
    startPolling?.(id, {
      silent: true,
      showWorkflow: false,
      publishLibrary: false,
      recovering: Boolean(options.recovering),
    });
  };
}
