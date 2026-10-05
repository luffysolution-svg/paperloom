import test from "node:test";
import assert from "node:assert/strict";

import {
  createDeveloperConfigResolver,
  resolveWorkflowDefaults,
} from "../../src/features/ingest/domain/workflow/developer-config.js";

const constants = {
  DEFAULT_WORKERS: 4,
  DEFAULT_BATCH_SIZE: 12,
  DEFAULT_CLASSIFY_BATCH_SIZE: 8,
  DEFAULT_COMPILE_WORKERS: 2,
  DEFAULT_TIMEOUT_SECONDS: 3600,
};

test("resolveWorkflowDefaults maps controller constants to config defaults", () => {
  assert.deepEqual(resolveWorkflowDefaults(constants), {
    workers: 4,
    batchSize: 12,
    classifyBatchSize: 8,
    compileWorkers: 2,
    timeoutSeconds: 3600,
  });
});

test("createDeveloperConfigResolver overlays saved config on defaults", () => {
  const { developerConfigWithDefaults } = createDeveloperConfigResolver({
    getDeveloperConfig: () => ({ workflow: "render", workers: 0, glossary_id: " g1 " }),
    normalizeWorkflow: (value) => value || "book",
    normalizeMathMode: (value) => value || "direct_typst",
    defaults: resolveWorkflowDefaults(constants),
    defaultModelName: () => "deepseek-chat",
    defaultModelBaseUrl: () => "https://api.deepseek.com",
  });

  const config = developerConfigWithDefaults();

  assert.equal(config.workflow, "render");
  assert.equal(config.workers, 4);
  assert.equal(config.batchSize, 12);
  assert.equal(config.classifyBatchSize, 8);
  assert.equal(config.compileWorkers, 2);
  assert.equal(config.timeoutSeconds, 3600);
  assert.equal(config.glossaryId, "g1");
  assert.equal(config.model, "deepseek-chat");
  assert.equal(config.baseUrl, "https://api.deepseek.com");
  assert.equal(config.mathMode, "direct_typst");
  assert.equal(config.translateTitles, true);
});

test("createDeveloperConfigResolver falls back to normalized defaults for empty saved config", () => {
  const { developerConfigWithDefaults } = createDeveloperConfigResolver({
    getDeveloperConfig: () => null,
    normalizeWorkflow: (value) => value || "book",
    normalizeMathMode: (value) => value || "direct_typst",
    defaults: resolveWorkflowDefaults(constants),
    defaultModelName: () => "deepseek-chat",
    defaultModelBaseUrl: () => "https://api.deepseek.com",
  });

  const config = developerConfigWithDefaults();

  assert.equal(config.workflow, "book");
  assert.equal(config.glossaryId, "");
  assert.equal(config.renderSourceJobId, "");
});
