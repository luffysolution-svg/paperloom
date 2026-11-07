import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskServiceCatalog } from "../../src/features/credentials/domain/task-service-catalog.js";

const credentials = {
  ocrProvider: "paddle", paddleToken: "paddle-main", mineruToken: "mineru-main",
  ocrCredentialRef: "", modelApiKey: "translation-main", translationCredentialRef: "",
};
const translation = {
  model: "main-model", baseUrl: "https://api.deepseek.com/v1", workers: 10,
  translationProfiles: {
    qwen: { apiKey: "qwen-key", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-model", workers: 20 },
    openai: { apiKey: "", baseUrl: "https://api.openai.com/v1", model: "empty-key" },
  },
};
const profile = {
  id: "backup", name: "备用配置", agent: { llm_api_key: "agent-never-applied" },
  credentials: { ...credentials, mineruToken: "mineru-backup", ocrProvider: "mineru", modelApiKey: "translation-backup" },
  translation: { model: "backup-model", baseUrl: "https://proxy.example/v1", workers: 3 },
};

test("上传服务目录保留默认值，并可独立组合不同方案的 OCR、翻译和模型", () => {
  const input = structuredClone({ credentials, translation, profiles: [profile] });
  const before = structuredClone(input);
  const catalog = buildTaskServiceCatalog(input);
  const current = catalog.resolve();
  assert.equal(current.ocr.token, "paddle-main");
  assert.equal(current.translation.apiKey, "translation-main");
  const chosen = catalog.resolve({ ocrId: "current:mineru", translationId: catalog.profiles[0].translationId, model: "manual-model" });
  assert.equal(chosen.ocr.token, "mineru-main");
  assert.equal(chosen.translation.apiKey, "translation-backup");
  assert.equal(chosen.translation.baseUrl, "https://proxy.example/v1");
  assert.equal(chosen.translation.workers, 3);
  assert.equal(chosen.model, "manual-model");
  assert.deepEqual(input, before, "读取和组合不修改保存的方案或 Agent");
  assert.equal(catalog.translations.some((item) => item.apiKey === "qwen-key"), true);
  assert.equal(catalog.translations.some((item) => item.model === "empty-key"), false, "没有凭据的预设不能伪装成可用服务");
});

test("相同接口和 Key 聚合模型，多个自定义接口保留各自凭据", () => {
  const sameService = { ...profile, id: "same", name: "其他模型", credentials, translation: { ...translation, model: "second-model" } };
  const catalog = buildTaskServiceCatalog({ credentials, translation, profiles: [sameService, profile] });
  assert.deepEqual(catalog.resolve().translation.models, ["main-model", "second-model"]);
  assert.equal(catalog.profiles[0].translationId, catalog.defaultTranslationId);
  assert.notEqual(catalog.profiles[1].translationId, catalog.defaultTranslationId);
  assert.equal(catalog.resolve(catalog.profiles[0]).model, "second-model");
  assert.equal(catalog.resolve(catalog.profiles[1]).translation.apiKey, "translation-backup");
});

test("旧凭据引用只属于原 OCR 服务，不能误用到另一家服务", () => {
  const catalog = buildTaskServiceCatalog({
    credentials: { ocrProvider: "mineru", ocrCredentialRef: "mineru-ref", translationCredentialRef: "translation-ref" },
    translation,
  });
  assert.equal(catalog.resolve().ocr.credentialRef, "mineru-ref");
  assert.equal(catalog.resolve().translation.credentialRef, "translation-ref");
  const paddle = catalog.ocr.find((item) => item.provider === "paddle");
  assert.equal(paddle.configured, false);
  assert.equal(paddle.credentialRef, "");
  assert.equal(catalog.resolve({ model: "" }).model, "", "用户清空模型不能悄悄回退到默认模型");
});
