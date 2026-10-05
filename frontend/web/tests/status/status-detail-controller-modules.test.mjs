import test from "node:test";
import assert from "node:assert/strict";

import { createStatusDetailStore } from "../../src/features/job-detail/domain/status-detail-store.js";
import { createStatusDetailDialogStore } from "../../src/features/job-detail/domain/status-detail-dialog-store.js";
import { createStatusDetailDialogActions } from "../../src/features/job-detail/domain/dialog/controller-dialog.js";
import { createStatusDetailFailureRecoveryActions } from "../../src/features/job-detail/domain/dialog/controller-failure.js";
import { createStatusDetailResumeActions } from "../../src/features/job-detail/domain/dialog/controller-resume.js";

// 拆 status-detail-controller 后的装配接缝回归：各 controller-*.ts 工厂只接受
// 自己需要的依赖，行为与拆分前一致。

test("dialog actions:按 tab 打开弹窗并触发对应数据加载", () => {
  const dialogStore = createStatusDetailDialogStore();
  let overviewLoads = 0;
  let translationLoads = 0;
  const actions = createStatusDetailDialogActions({
    dialogStore,
    ensureOverviewData: async () => { overviewLoads += 1; },
    ensureTranslationData: async () => { translationLoads += 1; },
    configPort: { buildDetailPageUrl: (jobId) => `/detail.html?job_id=${jobId}` },
  });

  actions.openStatusDetailDialog("translation");
  assert.equal(dialogStore.getState().open, true);
  assert.equal(dialogStore.getState().payload.activeTab, "translation");
  assert.equal(translationLoads, 1);
  assert.equal(overviewLoads, 0);

  actions.activateDetailTab();
  assert.equal(dialogStore.getState().payload.activeTab, "overview");
  assert.equal(overviewLoads, 1);

  assert.equal(actions.buildDetailPageUrl("job-9"), "/detail.html?job_id=job-9");
});

test("resume actions:syncRerunAction 经 store 驱动按钮状态", () => {
  const store = createStatusDetailStore();
  const resume = createStatusDetailResumeActions({
    runtimePort: {
      currentJobId: () => "job-1",
      rerunContext: () => ({
        job: { job_id: "job-1" },
        resumePlan: { can_resume: true, from_stage: "ocr" },
      }),
    },
    store,
    dialogStore: createStatusDetailDialogStore(),
    rerunJob: async () => ({ job_id: "job-2" }),
    resolveActions: () => ({ rerunEnabled: true, rerun: "rerun-url" }),
  });

  const actionUrl = resume.syncRerunAction();
  assert.equal(actionUrl, "rerun-url");
  assert.equal(store.getSnapshot().overview.rerun.enabled, true);
  assert.match(store.getSnapshot().overview.rerun.status, /可从 ocr 恢复/);
});

test("failure recovery:retryOcrNow 提交成功即关窗、提示并轮询新任务", async () => {
  const store = createStatusDetailStore();
  const dialogStore = createStatusDetailDialogStore();
  dialogStore.open({ activeTab: "overview" });
  store.actions.setOverview({
    failureRecovery: {
      kind: "queue_full",
      provider: "",
      providerCode: "",
      traceId: "",
      attempt: null,
      maxAttempts: null,
      retryAtMs: null,
      retryAfterSource: "",
      retryOcr: {
        available: true,
        enabled: true,
        method: "POST",
        url: "ocr-retry-url",
        body: { stage: "ocr" },
        reason: "",
        requiresDuplicateRisk: false,
      },
      checkpointArtifacts: [],
      preservesSourcePdf: false,
      statusText: "",
      preservationText: "",
      backendGaps: [],
    },
  });

  const retryCalls = [];
  let polled = "";
  let notice = null;
  const actions = createStatusDetailFailureRecoveryActions({
    retryJobStage: async (jobId, apiPrefix, stage, payload) => {
      retryCalls.push({ jobId, apiPrefix, stage, payload });
      return { job_id: "job-next" };
    },
    apiPrefix: "/api/v1",
    copyText: async () => {},
    store,
    dialogStore,
    startPolling: (jobId) => { polled = jobId; },
    setText: (id, message) => { notice = [id, message]; },
    getCurrentJobId: () => "job-1",
  });

  const payload = await actions.retryOcrNow();
  assert.equal(payload.job_id, "job-next");
  assert.equal(retryCalls[0].jobId, "job-1");
  assert.equal(retryCalls[0].apiPrefix, "/api/v1");
  assert.equal(retryCalls[0].stage, "ocr");
  assert.equal(dialogStore.getState().open, false);
  assert.equal(polled, "job-next");
  assert.equal(notice[0], "error-box");
  assert.match(notice[1], /job-next/);
});

test("failure recovery:无 job_id 的响应抛错且不关窗", async () => {
  const store = createStatusDetailStore();
  const dialogStore = createStatusDetailDialogStore();
  dialogStore.open({ activeTab: "overview" });
  store.actions.setOverview({
    failureRecovery: {
      kind: "generic",
      provider: "",
      providerCode: "",
      traceId: "",
      attempt: null,
      maxAttempts: null,
      retryAtMs: null,
      retryAfterSource: "",
      retryOcr: {
        available: true,
        enabled: true,
        method: "POST",
        url: "ocr-retry-url",
        body: { stage: "ocr" },
        reason: "",
        requiresDuplicateRisk: false,
      },
      checkpointArtifacts: [],
      preservesSourcePdf: false,
      statusText: "",
      preservationText: "",
      backendGaps: [],
    },
  });

  const actions = createStatusDetailFailureRecoveryActions({
    retryJobStage: async () => ({}),
    store,
    dialogStore,
    getCurrentJobId: () => "job-1",
  });

  await assert.rejects(() => actions.retryOcrNow(), /job_id/);
  assert.equal(dialogStore.getState().open, true);
});
