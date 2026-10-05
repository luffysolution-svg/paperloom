// 桌面端首配门的判据。
//
// 曾经的 bug：Key 明明都在输入框里，每次启动还是被「接口设置 / 先配好接口再开始」
// 拦一道。原因是门只看 desktop-config.json 的 firstRunCompleted，而输入框里的值
// 走的是另一条路（applyDefaultCredentialInputs 读同一份 snapshot 的 browserConfig）
// —— 两份数据互不相干。那个布尔只在「setupMode 下保存」时才写
// （persistence.ts 的 markConfigured），从设置中心保存不写，配置文件重建也会丢。
//
// 现在凭据齐全本身就算已配置。下面钉住三件事，它们各自都能悄悄坏掉：
//
//   1. **明文 token 和凭据库 ref 都算数**。早于凭据库的快照里只有 token 没有 ref，
//      只认 ref 会把这批老装机永远拦在门外。
//   2. **看的是当前 OCR provider 的那个 token**。填了 MinerU 但 provider 是 paddle，
//      不算配好——提交时照样跑不起来，这时候放行等于把问题推到更晚。
//   3. **两边都要有**。只有翻译 Key 没有 OCR 凭据（或反之）不算配好。

import test from "node:test";
import assert from "node:assert/strict";

import { hasDesktopCredentials } from "../../src/features/credentials/domain/desktop-readiness.js";

test("凭据库 ref 齐全就算配好", () => {
  assert.equal(hasDesktopCredentials({
    ocrProvider: "mineru",
    ocrCredentialRef: "cred_mineru",
    translationCredentialRef: "cred_translation",
  }), true);
});

test("只有明文 token 也算配好——早于凭据库的快照没有 ref", () => {
  assert.equal(hasDesktopCredentials({
    ocrProvider: "mineru",
    mineruToken: "mineru-token",
    modelApiKey: "sk-translation",
  }), true);
});

test("token 属于别的 provider 不算配好", () => {
  assert.equal(hasDesktopCredentials({
    ocrProvider: "paddle",
    mineruToken: "mineru-token",
    modelApiKey: "sk-translation",
  }), false, "provider 是 paddle，MinerU 的 token 顶不上");
});

test("缺省 provider 是 paddle", () => {
  assert.equal(hasDesktopCredentials({
    paddleToken: "paddle-token",
    modelApiKey: "sk-translation",
  }), true);
  assert.equal(hasDesktopCredentials({
    mineruToken: "mineru-token",
    modelApiKey: "sk-translation",
  }), false);
});

test("只有一边不算配好", () => {
  assert.equal(hasDesktopCredentials({
    ocrProvider: "mineru",
    mineruToken: "mineru-token",
  }), false, "没有翻译 Key");
  assert.equal(hasDesktopCredentials({
    ocrProvider: "mineru",
    modelApiKey: "sk-translation",
  }), false, "没有 OCR 凭据");
});

test("空白字符不是值", () => {
  assert.equal(hasDesktopCredentials({
    ocrProvider: "mineru",
    mineruToken: "   ",
    modelApiKey: "sk-translation",
  }), false);
});

test("空输入不炸", () => {
  assert.equal(hasDesktopCredentials(), false);
  assert.equal(hasDesktopCredentials(null), false);
  assert.equal(hasDesktopCredentials({}), false);
});
