// 翻译工作流对话框的 state port：打开模式与首页视图同步。
// 原在 library/recent-jobs.test.mjs 里，被测的是 features/ingest/domain/dialog，归到 ingest/。

import test from "node:test";
import assert from "node:assert/strict";
import { TRANSLATION_WORKFLOW_MODES } from "../../src/features/ingest/domain/dialog/contract.js";
import {
  createTranslationWorkflowDialogStatePort,
  homeViewModeForTranslationWorkflow,
} from "../../src/features/ingest/domain/dialog/state.js";

test("translation workflow dialog state port owns open mode and home view sync", () => {
  const modes = [];
  const port = createTranslationWorkflowDialogStatePort({
    homeStatePort: {
      setViewMode(mode) {
        modes.push(mode);
      },
    },
  });

  assert.deepEqual(port.getSnapshot(), {
    open: false,
    mode: TRANSLATION_WORKFLOW_MODES.UPLOAD,
  });
  assert.equal(
    homeViewModeForTranslationWorkflow(TRANSLATION_WORKFLOW_MODES.STATUS, false),
    "library",
  );

  port.open(TRANSLATION_WORKFLOW_MODES.STATUS);
  assert.deepEqual(port.getSnapshot(), {
    open: true,
    mode: TRANSLATION_WORKFLOW_MODES.STATUS,
  });
  port.setMode(TRANSLATION_WORKFLOW_MODES.UPLOAD);
  port.close();

  assert.deepEqual(modes, ["workflow_status", "workflow_upload", "library"]);
});
