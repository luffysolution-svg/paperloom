/** 凭据 / 设置对话框组件测试共用的夹具。
 *
 * credentials-dialog-component.test.mjs 拆成两个文件（设置中心入口 / 对话框校验与保存）
 * 之后，两边都要同一套 mock 校验器、内存 vault 和「等表单回填完再点」的等待，放这里
 * 免得复制两份各自走样。
 *
 * createHomeComposition 由调用方传进来，而不是在这里 import：它得在调用方装好 jsdom
 * 全局之后才能加载，而这个模块会被静态 import、先于调用方的顶层代码执行。
 */
import { waitFor as waitForBase } from "../../helpers/async.mjs";
import { byId } from "../../helpers/dom.mjs";

function mockValidators(overrides = {}) {
  return {
    validateOcrToken: async (_apiPrefix, _providerId, token) => {
      if (!token) {
        return { ok: false, status: "unauthorized", summary: "缺少 token" };
      }
      if (token === "bad-token") {
        return { ok: false, status: "unauthorized", summary: "Token 无效" };
      }
      return { ok: true, status: "valid", summary: "Token 有效" };
    },
    validateDeepSeekToken: async (_apiPrefix, payload) => {
      if (!payload?.api_key) {
        return { ok: false, status: 0 };
      }
      if (payload.api_key === "bad-key") {
        return { ok: false, status: 401, summary: "DeepSeek Key 无效或已过期。" };
      }
      return { ok: true, status: 200, summary: "DeepSeek 接口连接成功。" };
    },
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      balance_infos: [{ currency: "CNY", total_balance: "88.00" }],
    }),
    ...overrides,
  };
}

/** 主页装配：mock 校验器 + 一个内存里的凭据 vault（create / update / list）。 */
export function createCredentialServices(createHomeComposition, overrides = {}) {
  const { validateOcrToken, validateDeepSeekToken, queryDeepSeekBalance, ...rest } = mockValidators(overrides.validators);
  let vaultRevision = 0;
  let credentials = [];
  return createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
    validateOcrToken,
    validateDeepSeekToken,
    queryDeepSeekBalance,
    listCredentials: async () => ({
      credentials,
      revision: vaultRevision,
    }),
    createCredential: async (_apiPrefix, payload) => {
      vaultRevision += 1;
      const credential = {
        credential_ref: payload.kind === "ocr_provider_token"
          ? (payload.provider === "mineru" ? "cred_test_ocr_mineru" : "cred_test_ocr")
          : "cred_test_translation",
        kind: payload.kind,
        provider: payload.provider,
        label: payload.label,
        configured: true,
        revision: 1,
        created_at: "2026-09-02T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
      };
      credentials = [...credentials, credential];
      return { credential, revision: vaultRevision };
    },
    updateCredential: async (_apiPrefix, credentialRef, payload) => {
      vaultRevision += 1;
      const previous = credentials.find((item) => item.credential_ref === credentialRef) || {};
      const credential = {
        ...previous,
        credential_ref: credentialRef,
        kind: payload.kind || "translation_api_key",
        provider: payload.provider || "deepseek",
        label: payload.label || "翻译 API",
        configured: true,
        revision: Number(previous.revision || 0) + 1,
        updated_at: "2026-09-02T00:00:01Z",
      };
      credentials = credentials.filter((item) => item.credential_ref !== credentialRef);
      credentials.push(credential);
      return { credential, revision: vaultRevision };
    },
    ...rest,
    ...overrides,
  });
}

/** 绑定到某个 jsdom 的两个等待函数。 */
export function credentialsDialogWaits(dom) {
  // 预算用共用 helper 的 15 秒：它只是防挂死的兜底，不是断言。原来写死 3000ms，CI 上
  // 并发跑多个文件时「保存 Paddle」那步偶发超时，报出一个和断言无关的假失败。
  // 超时信息里带上状态条的真实内容：等「已保存」超时时，真正的原因几乎总是保存走了
  // 错误分支、状态条上写着别的东西，而光报「等待超时」完全看不出是哪一条。
  const waitFor = (predicate, description) => waitForBase(predicate, () => {
    const status = byId(dom, "browser-credentials-status")?.textContent ?? "(无状态条)";
    return `${description}；状态条=${JSON.stringify(status)}`;
  });

  // 表单填好之前别点保存。
  //
  // save-flow 的前置校验直接读 DOM 里的 modelBaseUrl / modelName /
  // translationWorkers；弹窗打开后这几项由一次异步回填写入，而用例此前只等
  // "OCR 提供商选择器出现" 就开点。机器一忙就会在回填之前点下去，校验失败 →
  // 状态条变成错误文案 → 等 "已保存" 一直等到超时，报出来的却是一个和本用例
  // 断言毫无关系的"等待超时"。
  async function waitForDialogReady() {
    await waitFor(() => {
      const model = byId(dom, "browser-model-name");
      const workers = byId(dom, "browser-translation-workers");
      const baseUrl = byId(dom, "browser-model-base-url");
      return Boolean(model && workers && baseUrl
        && `${model.value || ""}`.trim()
        && `${workers.value || ""}`.trim());
    }, "翻译配置回填完成");
  }

  return { waitFor, waitForDialogReady };
}
