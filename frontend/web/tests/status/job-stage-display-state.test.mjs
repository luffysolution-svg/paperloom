// 任务阶段契约 · 展示状态：以 display_stage 为准点亮哪个 tab、succeeded 怎么收尾、
// OCR 子阶段与百分比，以及生产代码不再引用遗留兼容门面。
// 从原 job-stage-contract.test.mjs（2400+ 行）按主题拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  collectStageProgressByKey,
  resolveDisplayedStagePresentation,
} from "@retainpdf/domain/job-status";
import {
  publicStageKeyOf,
  summarizeStageDetail,
  summarizeStageKey,
} from "@retainpdf/domain/job-status";
import { adaptJobStageSnapshot } from "@retainpdf/domain/job-status";

function collectSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    // 代码库已全量 TS：原先只收 .js，扫到 0 个文件，这条门禁一直在空转。
    return entry.isFile() && /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

test("frontend progress uses canonical display_stage event contract", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-new-events",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 1,
        total: 8,
      },
    },
    {
      items: [
        {
          seq: 1,
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 12,
            total: 34,
          },
        },
        {
          seq: 2,
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 4,
            total: 8,
          },
        },
        {
          seq: 3,
          display_stage: "render",
          stage: "rendering",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 5,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.ocr.progressText, "第 12/34 页");
  assert.equal(Math.round(progressByKey.ocr.displayPercent * 100) / 100, 39.71);
  assert.equal(progressByKey.translate.progressText, "第 4/8 批");
  assert.equal(progressByKey.render.progressText, "第 5/20 页");
});

test("succeeded job lights up the done tab regardless of stale display_stage", () => {
  // Backend v1: succeeded jobs ship stage_snapshot=null and no display_stage.
  // Even if a stale display_stage="ocr" leaks through, status="succeeded" must
  // win — otherwise reopening the dialog on a finished job would resurrect the
  // OCR tab via the stage-pin's "fallback to previous stageKey" path.
  const jobPresentation = resolveDisplayedStagePresentation({
    job_id: "job-ocr-subtask-succeeded",
    status: "succeeded",
    display_stage: "ocr",
    stage: "ocr_processing",
    substage: "provider_processing",
    progress: {
      unit: "page",
      current: 12,
      total: 34,
    },
  }, { items: [] });

  // Lower-level adapters operate without status context — they faithfully
  // report whatever stage was passed in. The clamp lives in the higher-level
  // resolveDisplayedStagePresentation pipeline.
  const jobSnapshot = adaptJobStageSnapshot({
    job_id: "job-ocr-subtask-succeeded",
    status: "succeeded",
    display_stage: "ocr",
    stage: "ocr_processing",
    substage: "provider_processing",
    progress: {
      unit: "page",
      current: 12,
      total: 34,
    },
  });

  assert.equal(jobPresentation.stageKey, "done");
  assert.equal(jobPresentation.stageKeyTrusted, true);
  assert.equal(jobSnapshot.stageKey, "ocr");
  assert.equal(jobSnapshot.publicStage, "ocr");
});

test("succeeded job with stage_snapshot=null still resolves to done (new contract)", () => {
  // Real shape of a finished job from rust_api v1: no display_stage, no
  // top-level stage info, stage_snapshot=null. The card must light up the
  // final tab — not stay stuck on whatever the previous frame showed.
  const presentation = resolveDisplayedStagePresentation({
    job_id: "job-new-contract-succeeded",
    status: "succeeded",
    stage_snapshot: null,
    background_snapshots: [],
  }, { items: [] });

  assert.equal(presentation.stageKey, "done");
  assert.equal(presentation.stageKeyTrusted, true);
  assert.equal(presentation.label, "完成");
});

test("succeeded detail follows OCR versus translation workflow semantics", () => {
  const ocrJob = {
    job_id: "job-ocr-only-succeeded",
    workflow: "ocr",
    status: "succeeded",
    display_stage: "done",
    stage_snapshot: null,
  };
  assert.equal(
    resolveDisplayedStagePresentation(ocrJob, { items: [] }).detail,
    "OCR/文档解析已完成",
  );
  assert.equal(summarizeStageDetail(ocrJob), "OCR/文档解析已完成");

  for (const workflow of ["book", "translate"]) {
    const translatedJob = {
      job_id: `job-${workflow}-succeeded`,
      workflow,
      status: "succeeded",
      display_stage: "done",
      stage_snapshot: null,
    };
    assert.equal(
      resolveDisplayedStagePresentation(translatedJob, { items: [] }).detail,
      "翻译 PDF 已生成",
    );
    assert.equal(summarizeStageDetail(translatedJob), "翻译 PDF 已生成");
  }
});

test("running job with display_stage=done does not skip render in the stage flow", () => {
  // Backends sometimes flip display_stage to "done" (or push the same via
  // stage_snapshot.publicStage / a final-artifact signal) while the job is
  // still in render. Without a clamp the stage-flow card would mark every
  // earlier stage as done and jump straight to "完成".
  const directDoneRunning = resolveDisplayedStagePresentation({
    job_id: "job-display-stage-done-running",
    status: "running",
    display_stage: "done",
    progress: { unit: "page", current: 1, total: 4 },
  }, { items: [] });
  assert.equal(directDoneRunning.stageKey, "render");
  assert.equal(directDoneRunning.label.includes("完成"), false);

  const snapshotDoneQueued = resolveDisplayedStagePresentation({
    job_id: "job-snapshot-done-queued",
    status: "queued",
    stage_snapshot: { publicStage: "done", source: "render-flow" },
  }, { items: [] });
  assert.equal(snapshotDoneQueued.stageKey, "render");
  assert.equal(snapshotDoneQueued.label.includes("完成"), false);

  const succeededDone = resolveDisplayedStagePresentation({
    job_id: "job-display-stage-done-succeeded",
    status: "succeeded",
    display_stage: "done",
  }, { items: [] });
  assert.equal(succeededDone.stageKey, "done");
});

test("recent-jobs card label clamps done while the job is still running", async () => {
  const { stageKeyForRecentJobLabel, recentJobStageLabel } = await import(
    "../../src/features/library/domain/card/recent-job-card-presenter.js"
  );
  // running + display_stage="done" should not advance the small card to "已完成".
  const runningWithDoneFlag = {
    job_id: "recent-running-done-flag",
    status: "running",
    display_stage: "done",
  };
  assert.equal(stageKeyForRecentJobLabel(runningWithDoneFlag), "render");
  assert.equal(recentJobStageLabel(runningWithDoneFlag), "渲染中");

  // queued + stage_snapshot.publicStage="done" should also be clamped.
  const queuedSnapshotDone = {
    job_id: "recent-queued-snapshot-done",
    status: "queued",
    stage_snapshot: { publicStage: "done", source: "render-flow" },
  };
  assert.equal(stageKeyForRecentJobLabel(queuedSnapshotDone), "render");

  // running + runtime_status.publicStage="done" — same clamp via the runtime path.
  const runtimeStatusDone = {
    job_id: "recent-runtime-status-done",
    status: "running",
    runtime_status: { publicStage: "done" },
  };
  assert.equal(stageKeyForRecentJobLabel(runtimeStatusDone), "render");
  assert.equal(recentJobStageLabel(runtimeStatusDone), "渲染中");

  // Truly succeeded jobs must still surface as "已完成".
  const succeededDone = {
    job_id: "recent-succeeded-done",
    status: "succeeded",
    display_stage: "done",
  };
  assert.equal(stageKeyForRecentJobLabel(succeededDone), "done");
  assert.equal(recentJobStageLabel(succeededDone), "已完成");
});

test("library merge keeps recent-jobs item.display_stage out of done while running", async () => {
  const { mergeLibraryJobItem } = await import(
    "../../src/features/library/domain/recent-jobs/runtime-item.js"
  );
  // Backend pushes a runtime patch with display_stage="done" while status is still "running".
  const merged = mergeLibraryJobItem(
    { job_id: "recent-merge-running-done", status: "running", stage: "render", display_stage: "render" },
    { job_id: "recent-merge-running-done", status: "running", display_stage: "done" },
    { stageAdapterPort: {} },
  );
  // The item we hand off to the card must not advertise the "done" stage yet.
  assert.notEqual(merged.display_stage, "done");
  assert.notEqual(merged.stage, "done");
  assert.notEqual(merged.runtime_status?.publicStage, "done");

  // Once status flips to succeeded, "done" propagates normally.
  const completed = mergeLibraryJobItem(
    { job_id: "recent-merge-succeeded", status: "running", stage: "render", display_stage: "render" },
    { job_id: "recent-merge-succeeded", status: "succeeded", display_stage: "done" },
    { stageAdapterPort: {} },
  );
  assert.equal(completed.display_stage, "done");
  assert.equal(completed.stage, "done");
});

test("internal completed text does not infer a public stage", () => {
  const runningTranslation = {
    job_id: "job-translation-internal-complete",
    workflow: "book",
    status: "succeeded",
    stage: "translation_batches_complete",
    substage: "translation_batches",
  };
  const runningRender = {
    job_id: "job-render-internal-succeeded",
    workflow: "book",
    status: "succeeded",
    stage: "render_compile_succeeded",
    substage: "render_compile",
  };

  assert.equal(summarizeStageKey(runningTranslation), "idle");
  assert.equal(summarizeStageKey(runningRender), "idle");
  assert.equal(publicStageKeyOf(runningTranslation), "");
  assert.equal(publicStageKeyOf(runningRender), "");
});

test("OCR stage progress keeps latest substage and composite percent", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-ocr-substage-progress",
      workflow: "book",
      status: "running",
      display_stage: "ocr",
      stage: "ocr_processing",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 8,
            total: 20,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 12,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.ocr.substageKey, "ocr_processing");
  assert.equal(progressByKey.ocr.current, 12);
  assert.equal(progressByKey.ocr.total, 20);
  assert.equal(progressByKey.ocr.progressText, "第 12/20 页");
  assert.equal(progressByKey.ocr.displayPercent, 57);
  assert.equal(progressByKey.ocr.bySubstage.ocr_processing.current, 12);
});

test("production status code does not import legacy compatibility facades", () => {
  // 原根 src/js 已在批次 5B 整体删除，改扫新世界三层。
  const sourceRoots = ["src/app", "src/features", "src/platform"].map((dir) => path.resolve(dir));
  const blockedImports = [
    "job-stage-contract.js",
    "job-stage-render-detection.js",
  ];
  assert.equal(fs.existsSync(path.resolve("src/js")), false, "src/js 不得复活");
  const collected = sourceRoots.flatMap((root) => {
    assert.equal(fs.existsSync(root), true, `扫描根不存在，门禁已失效: ${root}`);
    return collectSourceFiles(root);
  });
  assert.ok(collected.length > 0, "扫描根为空，门禁已失效");
  const offenders = collected
    .flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      return blockedImports
        .filter((blocked) => source.includes(`/${blocked}`) || source.includes(`./${blocked}`) || source.includes(`../${blocked}`))
        .map((blocked) => `${path.relative(process.cwd(), file)} -> ${blocked}`);
    });

  assert.deepEqual(offenders, []);
});

test("OCR raw stage no longer creates fallback progress or visual state", () => {
  const presentation = resolveDisplayedStagePresentation({
    job_id: "job-ocr-raw-stage-only",
    status: "running",
    display_stage: "ocr",
    stage: "ocr_processing",
  }, { items: [] });

  assert.equal(presentation.stageKey, "ocr");
  assert.equal(presentation.visualStageKey, "ocr");
  assert.equal(presentation.progressCurrent, null);
  assert.equal(presentation.progressTotal, null);
  assert.equal(presentation.progressText, "");
});

test("canonical OCR visual stage ignores raw OCR fallback", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-canonical-ocr-visual",
      status: "running",
      display_stage: "ocr",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_upload",
          substage: "provider_processing",
          progress: {
            unit: "page",
            current: 8,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.ocr.stageKey, "ocr");
  assert.equal(progressByKey.ocr.substageKey, "ocr_processing");
  assert.equal(progressByKey.ocr.visualStageKey, "ocr_processing");
  assert.equal(progressByKey.ocr.current, 8);
  assert.equal(progressByKey.ocr.total, 20);
});

test("canonical OCR without recognized substage does not use raw visual fallback", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-canonical-ocr-unknown-substage",
      status: "running",
      display_stage: "ocr",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_upload",
          substage: "provider_waiting",
          progress: {
            unit: "step",
            current: 1,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.ocr.stageKey, "ocr");
  assert.equal(progressByKey.ocr.substageKey, "");
  assert.equal(progressByKey.ocr.visualStageKey, "ocr");
});
