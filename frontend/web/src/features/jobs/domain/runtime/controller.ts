// job-runtime 的装配根。业务按职责拆到同目录聚焦模块：
// - poll-engine.ts       轮询状态机（timer / 可见性暂停 / 失败退避 / fetch 编排）
// - poll-frame-steps.ts  单帧 render / publish / settle 编排步骤
// - poll-placeholder.ts  占位首帧与书架发布键（纯函数）
// - poll-session.ts      一轮轮询的可变会话状态
// - cancel-job.ts        取消当前任务
// - retry-stage.ts       阶段重试与书目元数据解析
// - job-presentation.ts  展示谓词（normalize / terminal）装配
// 本文件只负责：解析可注入依赖端口、实例化各 factory、拼出对外返回对象。

import {
  createJobEventsResource,
} from "./job-events-resource.js";
import { createCurrentJobStatePort } from "./current-job-state.js";
import { createSecondaryResourceStatePort } from "./secondary-resource-cache.js";
import {
  createJobRenderContextPort,
} from "./render-context.js";
import {
  createRuntimePollingStatePort,
} from "./runtime-polling-state.js";
import {
  notifyLibraryJobUpdated,
} from "./library-events.js";
import { createSecondaryResourceSchedulerPort } from "./secondary-resources.js";
import { returnJobRuntimeToHome } from "./runtime-reset.js";
import { createJobRuntimeShellViewPort } from "./shell-view-port.js";
import { createJobRuntimeResetStatePort } from "./reset-state-port.js";
import { createJobPresentation } from "./job-presentation.js";
import { createJobPollSession } from "./poll-session.js";
import { createJobPollFrameSteps } from "./poll-frame-steps.js";
import { createJobPollEngine } from "./poll-engine.js";
import { createCancelCurrentJob } from "./cancel-job.js";
import { createRetryStage } from "./retry-stage.js";

export function mountJobRuntimeFeature({
  state,
  apiPrefix,
  cancelJob,
  cancelOcrJob,
  fetchJobPayload,
  fetchJobEvents,
  fetchJobArtifactsManifest,
  fetchJobStageActions,
  retryJobStage,
  renderJob,
  renderJobSecondaryPatch,
  setText,
  setWorkflowSections,
  resetUploadProgress,
  resetUploadedFile,
  applyWorkflowMode,
  clearPageRanges,
  updateJobWarning,
  activateDetailTab,
  resetStatusDetailRuntimeView,
  onReaderDialogSync,
  onReaderDialogClose,
  onJobSucceeded,
  uploadStatePort,
  libraryEventPort,
  jobEventsResource = createJobEventsResource({ fetchJobEvents, apiPrefix }),
  pollingPort = createRuntimePollingStatePort(state),
  currentJobPort = createCurrentJobStatePort(state),
  secondaryResourcePort = createSecondaryResourceStatePort(state),
  shellViewPort = createJobRuntimeShellViewPort(),
  jobPresentationPort,
  resetStatePort = createJobRuntimeResetStatePort(state),
  renderContextPort = createJobRenderContextPort(state, { jobPresentationPort }),
  secondaryResourceSchedulerPort = createSecondaryResourceSchedulerPort({
    state,
    apiPrefix,
    fetchJobEvents,
    jobEventsResource,
    fetchJobArtifactsManifest,
    fetchJobStageActions,
    renderJobSecondaryPatch,
    notifyLibraryJobUpdated: (job) => notifyLibraryJobUpdated(job, { port: libraryEventPort }),
    pollingPort,
    currentJobPort,
    secondaryResourcePort,
    renderContextPort,
    jobPresentationPort,
  }),
}: any) {
  const presentation = createJobPresentation({ jobPresentationPort });
  const session = createJobPollSession();
  const frameSteps = createJobPollFrameSteps({
    secondaryResourcePort,
    renderContextPort,
    renderJob,
    libraryEventPort,
    isJobTerminal: presentation.isJobTerminal,
    onJobSucceeded,
    pollingPort,
    session,
  });
  const engine = createJobPollEngine({
    state,
    apiPrefix,
    fetchJobPayload,
    pollingPort,
    currentJobPort,
    resetStatePort,
    shellViewPort,
    renderContextPort,
    renderJob,
    secondaryResourceSchedulerPort,
    libraryEventPort,
    normalizeJobPayload: presentation.normalizeJobPayload,
    isJobTerminal: presentation.isJobTerminal,
    session,
    frameSteps,
    setText,
    setWorkflowSections,
    onReaderDialogSync,
  });
  const cancelCurrentJob = createCancelCurrentJob({
    currentJobPort,
    shellViewPort,
    setText,
    cancelJob,
    cancelOcrJob,
    apiPrefix,
    fetchJob: engine.fetchJob,
  });
  const retryStage = createRetryStage({
    retryJobStage,
    apiPrefix,
    currentJobPort,
    setText,
    normalizeJobPayload: presentation.normalizeJobPayload,
    startPolling: engine.startPolling,
    fetchJob: engine.fetchJob,
  });

  function returnToHome() {
    returnJobRuntimeToHome({
      state,
      onReaderDialogClose,
      setWorkflowSections,
      resetUploadProgress,
      resetUploadedFile,
      applyWorkflowMode,
      clearPageRanges,
      setText,
      updateJobWarning,
      activateDetailTab,
      resetStatusDetailRuntimeView,
      uploadStatePort,
      shellViewPort,
      jobPresentationPort,
    });
  }

  return {
    cancelCurrentJob,
    currentJobId: () => currentJobPort.jobId(),
    fetchJob: engine.fetchJob,
    retryStage,
    returnToHome,
    startPolling: engine.startPolling,
    stopPolling: engine.stopPolling,
  };
}
