// 状态卡 · 完成态与操作：done 阶段继承渲染进度并强制 100%，主操作 / 结果 / 取消 / 重试
// 各自的视图模型，错误态与选中阶段展示。
// 从原 status-card.test.mjs（2000+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveSelectedStageContext } from "@retainpdf/domain/job-status";
import { buildSelectedStageDisplay } from "@retainpdf/domain/job-status";
import { currentStageProgressViewModel } from "@retainpdf/domain/job-status";
import { buildStatusCardPrimaryActions } from "@retainpdf/domain/job-status";
import { buildStatusCardResultActions } from "@retainpdf/domain/job-status";
import { buildStatusCardRetryActions } from "@retainpdf/domain/job-status";
import { normalizeStageRetryActions } from "@retainpdf/domain/job-status";
import { buildStatusCardTaskActions } from "@retainpdf/domain/job-status";
import { buildStatusCardErrorState } from "@retainpdf/domain/job-status";

test("done stage inherits the last render progress for the status card", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      progressCurrent: 100,
      progressTotal: 100,
      progressText: "翻译 PDF 已生成",
      progressUnit: "percent",
      stageProgressByKey: {
        render: {
          current: 100,
          total: 100,
          progressText: "渲染完成",
          progressUnit: "percent",
          visualStageKey: "render_compile",
          substageKey: "render_compile",
        },
      },
    },
    selectedStageKey: "",
  });

  assert.equal(context.selected, "done");
  assert.equal(context.selectedProgress.progressText, "渲染完成");
  assert.equal(context.selectedProgress.visualStageKey, "render_compile");
  assert.equal(context.selectedProgress.current, 100);
  assert.equal(context.selectedProgress.total, 100);
  assert.equal(context.selectedProgress.displayPercent, 100);
});

test("succeeded done stage keeps render visual state but forces 100 percent", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      progressCurrent: 100,
      progressTotal: 100,
      progressText: "翻译 PDF 已生成",
      progressUnit: "percent",
      stageProgressByKey: {
        render: {
          current: 90,
          total: 100,
          progressText: "正在编译 PDF",
          progressUnit: "percent",
          visualStageKey: "render_compile",
          substageKey: "render_compile",
        },
      },
    },
    selectedStageKey: "",
  });

  assert.equal(context.selectedProgress.current, 100);
  assert.equal(context.selectedProgress.total, 100);
  assert.equal(context.selectedProgress.displayPercent, 100);
  assert.equal(context.selectedProgress.progressText, "渲染完成");
  assert.equal(context.selectedProgress.visualStageKey, "render_compile");
});

test("completed done stage keeps render visual state but forces 100 percent", () => {
  const context = resolveSelectedStageContext({
    snapshot: {
      stageKey: "done",
      status: "completed",
      progressCurrent: 4,
      progressTotal: 100,
      progressText: "编译 4/4",
      progressUnit: "step",
      stageProgressByKey: {
        render: {
          current: 4,
          total: 100,
          progressText: "编译 4/4",
          progressUnit: "step",
          visualStageKey: "render_compile",
          substageKey: "render_compile",
        },
      },
    },
    selectedStageKey: "",
  });

  assert.equal(context.selectedProgress.current, 100);
  assert.equal(context.selectedProgress.total, 100);
  assert.equal(context.selectedProgress.displayPercent, 100);
  assert.equal(context.selectedProgress.progressText, "渲染完成");
  assert.equal(context.selectedProgress.progressUnit, "percent");
  assert.equal(context.selectedProgress.visualStageKey, "render_compile");
});

test("done stage progress policy is owned by the status progress view model", () => {
  const progress = currentStageProgressViewModel({
    stageKey: "done",
    status: "succeeded",
    progressCurrent: 100,
    progressTotal: 100,
    progressText: "翻译 PDF 已生成",
    progressUnit: "percent",
    stageProgressByKey: {
      render: {
        current: 88,
        total: 100,
        progressText: "正在编译 PDF",
        progressUnit: "percent",
        visualStageKey: "render_compile",
        substageKey: "render_compile",
      },
    },
  }, {
    normalizeSelectedProgress: (value) => value,
  });

  assert.equal(progress.current, 100);
  assert.equal(progress.total, 100);
  assert.equal(progress.displayPercent, 100);
  assert.equal(progress.progressText, "渲染完成");
  assert.equal(progress.progressUnit, "percent");
  assert.equal(progress.visualStageKey, "render_compile");
  assert.equal(progress.substageKey, "render_compile");
});

test("status card primary actions are visible only for selected done stage", () => {
  const snapshot = {
    pdfReady: true,
    pdfUrl: "/api/v1/jobs/job-1/pdf",
    markdownBundleReady: true,
    markdownBundleUrl: "/api/v1/jobs/job-1/artifacts/markdown_zip",
    readerReady: true,
    readerUrl: "/reader.html?job_id=job-1",
    sourcePdfReady: true,
    sourcePdfUrl: "/api/v1/jobs/job-1/artifacts/source_pdf",
  };

  assert.deepEqual(
    buildStatusCardPrimaryActions({
      selectedStageKey: "done",
      snapshot,
    }),
    {
      pdfReady: true,
      pdfUrl: "/api/v1/jobs/job-1/pdf",
      markdownBundleReady: true,
      markdownBundleUrl: "/api/v1/jobs/job-1/artifacts/markdown_zip",
      readerReady: true,
      readerUrl: "/reader.html?job_id=job-1",
      sourcePdfReady: true,
      sourcePdfUrl: "/api/v1/jobs/job-1/artifacts/source_pdf",
    },
  );
  assert.deepEqual(
    buildStatusCardPrimaryActions({
      selectedStageKey: "render",
      snapshot,
    }),
    {
      pdfReady: false,
      pdfUrl: "/api/v1/jobs/job-1/pdf",
      markdownBundleReady: false,
      markdownBundleUrl: "/api/v1/jobs/job-1/artifacts/markdown_zip",
      readerReady: false,
      readerUrl: "/reader.html?job_id=job-1",
      sourcePdfReady: false,
      sourcePdfUrl: "/api/v1/jobs/job-1/artifacts/source_pdf",
    },
  );
});

test("status card result actions view model owns artifact readiness", () => {
  const manifest = {
    items: [
      {
        artifact_key: "source_pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-result-actions/artifacts/source_pdf",
      },
      {
        artifact_key: "markdown_bundle_zip",
        ready: true,
        resource_path: "/api/v1/jobs/job-result-actions/artifacts/markdown_bundle_zip",
      },
      {
        artifact_key: "pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-result-actions/pdf",
      },
    ],
  };

  const succeeded = buildStatusCardResultActions({
    job: {
      job_id: "job-result-actions",
      status: "succeeded",
      display_stage: "done",
      output_pdf_ready: true,
      pdf_url: "/api/v1/jobs/job-result-actions/pdf",
    },
    manifest,
  });
  assert.equal(succeeded.readerReady, true);
  assert.equal(succeeded.sourcePdfReady, true);
  assert.equal(succeeded.markdownBundleReady, true);
  assert.match(succeeded.markdownBundleUrl, /include_job_dir=true/);
  assert.equal(succeeded.pdfReady, true);

  const activeStageSucceeded = buildStatusCardResultActions({
    job: {
      job_id: "job-active-stage-result-actions",
      status: "succeeded",
      display_stage: "render",
      output_pdf_ready: true,
      pdf_url: "/api/v1/jobs/job-active-stage-result-actions/pdf",
    },
    manifest,
  });
  assert.equal(activeStageSucceeded.readerReady, false);
  assert.equal(activeStageSucceeded.sourcePdfReady, false);
  assert.equal(activeStageSucceeded.markdownBundleReady, false);
  assert.equal(activeStageSucceeded.pdfReady, false);

  const running = buildStatusCardResultActions({
    job: {
      job_id: "job-result-actions",
      status: "running",
      actions: {
        cancel: {
          enabled: true,
          url: "/api/v1/jobs/job-result-actions/cancel",
        },
      },
    },
    manifest,
  });
  assert.equal(running.readerReady, false);
  assert.equal(running.sourcePdfReady, false);
  assert.equal(running.markdownBundleReady, false);
  assert.equal(running.pdfReady, false);
});

test("status card task actions view model owns cancel readiness", () => {
  const succeeded = buildStatusCardTaskActions({
    job: {
      job_id: "job-task-actions",
      status: "succeeded",
    },
  });
  assert.equal(succeeded.cancelEnabled, false);

  const running = buildStatusCardTaskActions({
    job: {
      job_id: "job-task-actions",
      status: "running",
      actions: {
        cancel: {
          enabled: true,
          url: "/api/v1/jobs/job-task-actions/cancel",
        },
      },
    },
  });
  assert.equal(running.cancelEnabled, true);

  const runningWithoutActionUrl = buildStatusCardTaskActions({
    job: {
      job_id: "job-task-actions-with-standard-route",
      status: "running",
    },
  });
  assert.equal(
    runningWithoutActionUrl.cancelEnabled,
    true,
    "标准 jobs cancel 路由存在时不应强制要求 action URL",
  );
});

test("status card retry actions view model owns stage action normalization", () => {
  const actions = buildStatusCardRetryActions({
    stages: [
      {
        stage: "translation",
        label: "重新翻译",
        can_retry: true,
      },
      {
        stage: "render",
        can_retry: false,
        disabled_reason: "等待翻译完成",
      },
    ],
  });

  assert.equal(actions.translate.stage, "translation");
  assert.equal(actions.translate.label, "重新翻译");
  assert.equal(actions.translate.canRetry, true);
  assert.equal(actions.render.stage, "render");
  assert.equal(actions.render.canRetry, false);
  assert.equal(actions.render.disabledReason, "等待翻译完成");
});

test("ui layer no longer keeps legacy stage action helper", () => {
  assert.equal(
    fs.existsSync(path.resolve("src/js/ui/stage-actions.js")),
    false,
  );
  assert.equal(typeof normalizeStageRetryActions, "function");
});

test("status card error state is owned by the status error view model", () => {
  assert.deepEqual(
    buildStatusCardErrorState({
      stageKey: "failed",
      errorText: "翻译失败",
    }),
    {
      errorText: "翻译失败",
      isErrorStage: true,
      showError: true,
      bodyHasError: true,
    },
  );
  assert.deepEqual(
    buildStatusCardErrorState({
      stageKey: "canceled",
      errorText: "用户取消",
    }),
    {
      errorText: "用户取消",
      isErrorStage: true,
      showError: true,
      bodyHasError: true,
    },
  );
  assert.deepEqual(
    buildStatusCardErrorState({
      stageKey: "translate",
      errorText: "后台诊断文本",
    }),
    {
      errorText: "后台诊断文本",
      isErrorStage: false,
      showError: false,
      bodyHasError: false,
    },
  );
  assert.deepEqual(
    buildStatusCardErrorState({
      stageKey: "failed",
      errorText: "   ",
    }),
    {
      errorText: "",
      isErrorStage: true,
      showError: false,
      bodyHasError: false,
    },
  );
});

test("selected stage display view model groups display state for the status card", () => {
  const display = buildSelectedStageDisplay({
    selectedStageKey: "done",
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      detail: "翻译 PDF 已生成",
      pdfReady: true,
      pdfUrl: "/api/v1/jobs/job-1/pdf",
      markdownBundleReady: true,
      markdownBundleUrl: "/api/v1/jobs/job-1/artifacts/markdown_zip",
      readerReady: true,
      readerUrl: "/reader.html?job_id=job-1",
      sourcePdfReady: true,
      sourcePdfUrl: "/api/v1/jobs/job-1/artifacts/source_pdf",
      stageRetryActions: {
        render: { enabled: true },
      },
      stageProgressByKey: {
        render: {
          current: 90,
          total: 100,
          progressText: "正在编译 PDF",
          progressUnit: "percent",
          visualStageKey: "render_compile",
          substageKey: "render_compile",
        },
      },
    },
  });

  assert.equal(display.selected, "done");
  assert.equal(display.selectedIsCurrent, true);
  assert.equal(display.visualStageKey, "render_compile");
  assert.equal(display.detailText, "翻译 PDF 已生成");
  assert.equal(display.showDetail, true);
  assert.equal(display.errorState.showError, false);
  assert.equal(display.primaryActions.pdfReady, true);
  assert.equal(display.primaryActions.readerReady, true);
  assert.equal(display.retryAction, undefined);

  const renderDisplay = buildSelectedStageDisplay({
    selectedStageKey: "render",
    snapshot: {
      stageKey: "done",
      status: "succeeded",
      detail: "翻译 PDF 已生成",
      pdfReady: true,
      pdfUrl: "/api/v1/jobs/job-1/pdf",
      readerReady: true,
      readerUrl: "/reader.html?job_id=job-1",
      stageRetryActions: {
        render: { enabled: true },
      },
      stageProgressByKey: {
        render: {
          current: 90,
          total: 100,
          progressText: "正在编译 PDF",
          progressUnit: "percent",
          visualStageKey: "render_compile",
          substageKey: "render_compile",
        },
      },
    },
  });

  assert.equal(renderDisplay.selected, "render");
  assert.equal(renderDisplay.selectedIsCurrent, false);
  assert.equal(renderDisplay.visualStageKey, "render_compile");
  assert.equal(renderDisplay.primaryActions.pdfReady, false);
  assert.equal(renderDisplay.primaryActions.readerReady, false);
  assert.deepEqual(renderDisplay.retryAction, { enabled: true });
});
