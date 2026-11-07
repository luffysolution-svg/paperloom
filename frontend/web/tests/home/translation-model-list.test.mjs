import test from "node:test";
import assert from "node:assert/strict";

const { createTranslationModelListFlow } = await import(
  "../../src/features/credentials/domain/model-list-flow.js"
);

function fixture(listModels) {
  const elements = {
    apiKeyInput: { value: "sk-test" },
    modelBaseUrlInput: { value: "https://api.example.com/v1" },
  };
  const states = [];
  const flow = createTranslationModelListFlow({
    apiPrefix: "/api/v1",
    dialogElementsPort: { elements: () => elements },
    currentProvider: () => "custom",
    listModels,
    viewPort: { setTranslationModels: (state) => states.push(state) },
  });
  return { elements, states, flow };
}

test("拉取模型返回结构化列表，并保留最新请求结果", async () => {
  const fixtureData = fixture(async (_prefix, payload) => {
    assert.deepEqual(payload, {
      api_key: "sk-test",
      api_protocol: "openai",
      base_url: "https://api.example.com/v1",
    });
    return { ok: true, summary: "已获取 2 个模型", models: ["model-b", "model-a", "model-a"] };
  });

  assert.equal(await fixtureData.flow.fetchModels(), true);
  assert.deepEqual(fixtureData.states.at(-1), {
    items: ["model-b", "model-a", "model-a"],
    loading: false,
    tone: "valid",
    message: "已获取 2 个模型",
    provider: "custom",
    baseUrl: "https://api.example.com/v1",
  });
});

test("模型拉取期间配置发生变化时丢弃旧响应", async () => {
  let resolve;
  const fixtureData = fixture(() => new Promise((r) => { resolve = r; }));
  const pending = fixtureData.flow.fetchModels();
  fixtureData.elements.modelBaseUrlInput.value = "https://other.example/v1";
  resolve({ ok: true, models: ["stale-model"] });
  assert.equal(await pending, false);
  assert.equal(fixtureData.states.at(-1).loading, false);
  assert.deepEqual(fixtureData.states.at(-1).items, []);
});

test("配置变化后失败的旧请求不会留下错误或锁住拉取按钮", async () => {
  let reject;
  const f = fixture(() => new Promise((_resolve, fail) => { reject = fail; }));
  const pending = f.flow.fetchModels();
  f.elements.apiKeyInput.value = "new-key";
  reject(new Error("old-key unauthorized"));
  assert.equal(await pending, false);
  assert.equal(f.states.at(-1).loading, false);
  assert.equal(f.states.at(-1).tone, "");
});

