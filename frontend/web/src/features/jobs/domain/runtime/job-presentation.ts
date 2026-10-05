import { isTerminalStatus as isDomainTerminalStatus } from "@retainpdf/domain/job";

/**
 * 任务展示谓词的装配：从 composition 注入的 jobPresentationPort 取
 * normalizeJobPayload / isTerminalStatus / isJobTerminal，缺失时回落到内置默认实现。
 * 这些谓词被轮询引擎与重试动作共用，集中一处便于注入与单测。
 */
export function createJobPresentation({ jobPresentationPort }: any = {}) {
  const normalizeJobPayload =
    jobPresentationPort?.normalizeJobPayload || ((value: any) => value || {});
  // 默认回退只把「硬失败/取消」当终态（成功需等 port 侧带完成信号判定），
  // 复用 domain 真值再排除 succeeded，语义与旧的 failed/canceled 完全一致。
  const isTerminalStatus =
    jobPresentationPort?.isTerminalStatus ||
    ((status: any) => isDomainTerminalStatus(status) && status !== "succeeded");
  const isJobTerminal =
    jobPresentationPort?.isJobTerminal ||
    ((value: any = {}) => isTerminalStatus(value?.status || value));
  return { normalizeJobPayload, isTerminalStatus, isJobTerminal };
}
