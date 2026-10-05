/**
 * 一轮轮询会话的可变状态（无副作用）。fetchJob / 失败退避 / 可见性恢复
 * 之间靠它共享：本轮是否广播书架、上次已推的 status|stage、连续瞬态失败次数、
 * 横幅是否由本轮挂起、以及首帧是否处于「恢复陈旧缓存」语境。
 */
export interface JobPollSession {
  /** 本轮是否向图书馆全量广播。silent 时只推 status/stage 变化。 */
  publishLibrary: boolean;
  /** silent 下上次已推到书架的 status|stage，用于跳过同态重复 notify。 */
  lastLibraryPublishKey: string;
  /** 瞬态失败连续次数。 */
  failureCount: number;
  /** 横幅是否由本轮询挂起（成功只清自己挂的横幅）。 */
  errorVisible: boolean;
  /** 首帧 payload 来自本地持久化恢复。 */
  recovering: boolean;
}

export function createJobPollSession(): JobPollSession {
  return {
    publishLibrary: true,
    lastLibraryPublishKey: "",
    failureCount: 0,
    errorVisible: false,
    recovering: false,
  };
}
