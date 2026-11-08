import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { hasModelApiKey, resetReaderAiConfigAdapters, resolveReaderAiConfig, setReaderAiConfigAdapters } from "../../../../frontend/packages/reader/src/shared/ai/config.ts";
import { buildHomeAskModelRequestOverrides } from "@/features/ask/domain/home-ask-request-config.js";

afterEach(resetReaderAiConfigAdapters);

for (const apiProtocol of ["anthropic", "openai_responses"]) {
  test(`${apiProtocol} translation settings cannot override chat credentials or unlock its composer`, () => {
    setReaderAiConfigAdapters({
      credentialsPort: { getCredentials: () => ({ modelApiKey: "translation-only-key" }) },
      loadDeveloperStoredConfig: () => ({ apiProtocol, baseUrl: "https://translation.example/v1", model: "translation-model" }),
    });
    const config = resolveReaderAiConfig();
    assert.equal(hasModelApiKey(), false);
    assert.deepEqual(buildHomeAskModelRequestOverrides(config), {});
    assert.equal(config.baseUrl, "");
    assert.equal(config.model, "");
  });
}

test("legacy OpenAI-compatible browser settings still work", () => {
  setReaderAiConfigAdapters({
    credentialsPort: { getCredentials: () => ({ modelApiKey: "legacy-key" }) },
    loadDeveloperStoredConfig: () => ({ baseUrl: "https://legacy.example/v1", model: "legacy-model" }),
  });
  assert.equal(hasModelApiKey(), true);
  assert.deepEqual(buildHomeAskModelRequestOverrides(resolveReaderAiConfig()), {
    llmApiKey: "legacy-key", llmBaseUrl: "https://legacy.example/v1", llmModel: "legacy-model",
  });
});
