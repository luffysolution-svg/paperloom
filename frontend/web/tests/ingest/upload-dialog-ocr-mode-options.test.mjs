// 切到「仅 OCR」时「翻译选项」面板必须一起收起。
//
// 曾经的样子：ProcessingChoicePanel 里的开关按钮 #page-range-btn 带了
// `pageRangeButtonVisible && !ocrOnly`，切到「仅 OCR」会隐藏；但面板本身
// （TranslationOptionsPanel）的显隐只看 upload.translationOptionsOpen，压根不看
// ocrOnly。于是「在翻译 tab 展开选项面板 → 切到仅 OCR」会留下一个孤儿：面板
// 原地挂在屏上，标题还写着「翻译选项」（里面一半是术语表，纯翻译概念），而它
// 的开关按钮已经不见了。面板自带 X 能关掉，所以不是死锁，但状态不自洽。
//
// 不写这条测试就会重犯的原因：这两个显隐条件写在两个文件里，彼此不知道对方
// 存在。任何一次「给 OCR 模式加/减一个按钮」的改动都可能再次让它们脱节，而
// 脱节的表现是静默的——没有报错、没有控制台警告，只有一块该消失却还在的 UI。

import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "../helpers/async.mjs";
import { clickWithMouseDown, makeDom } from "../helpers/dom.mjs";
import { bootHomeApp } from "../helpers/home-app.mjs";

test("从「翻译」切到「仅 OCR」时，已展开的翻译选项面板不会留在屏上", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  clickWithMouseDown(dom, byId("library-add-pdf-btn"));
  await waitFor(() => byId("translation-workflow-dialog") !== null, "添加对话框打开");

  // 文件就绪才会露出处理方式区（含「选项」开关按钮）
  services.stores.uploadView.actions.patch({ ready: true, actionSlotVisible: true });
  await waitFor(() => byId("page-range-btn"), "翻译选项开关按钮出现");

  clickWithMouseDown(dom, byId("page-range-btn"));
  await waitFor(() => byId("page-range-dialog"), "翻译选项面板展开");
  assert.equal(
    services.stores.uploadView.getSnapshot().translationOptionsOpen,
    true,
    "前置条件：面板确实是展开的",
  );

  const ocrModeTab = dom.window.document.querySelector('[aria-label="仅 OCR 模式"]');
  assert.ok(ocrModeTab, "仅 OCR 模式入口存在");
  clickWithMouseDown(dom, ocrModeTab);

  await waitFor(
    () => services.stores.workflowView.getSnapshot().ocrOnly === true,
    "切换到仅 OCR 模式",
  );
  assert.equal(
    services.stores.uploadView.getSnapshot().translationOptionsOpen,
    false,
    "切到「仅 OCR」必须一起收起翻译选项面板，否则它会变成没有开关按钮的孤儿",
  );
  await waitFor(() => byId("page-range-dialog") === null, "翻译选项面板从 DOM 上消失");
  assert.equal(
    byId("page-range-btn").classList.contains("hidden"),
    true,
    "OCR 模式下选项开关按钮本来就是隐藏的——面板留着就没有入口可以再关它",
  );

  root.unmount();
  services.dispose();
  host.remove();
});

test("切回「翻译」后已填的页码还在（收起只翻开关，不吃掉输入）", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  clickWithMouseDown(dom, byId("library-add-pdf-btn"));
  await waitFor(() => byId("translation-workflow-dialog") !== null, "添加对话框打开");
  services.stores.uploadView.actions.patch({ ready: true, actionSlotVisible: true });
  await waitFor(() => byId("page-range-btn"), "翻译选项开关按钮出现");

  clickWithMouseDown(dom, byId("page-range-btn"));
  await waitFor(() => byId("page-range-dialog"), "翻译选项面板展开");
  services.stores.uploadView.actions.setPageRange({ start: "2", end: "7" });

  const tab = (label) => dom.window.document.querySelector(`[aria-label="${label}"]`);
  clickWithMouseDown(dom, tab("仅 OCR 模式"));
  await waitFor(
    () => services.stores.uploadView.getSnapshot().translationOptionsOpen === false,
    "切到 OCR 后面板收起",
  );

  // 页码对 OCR 任务同样有效（collectRunPayload 的 ocrOnly 分支照样把 pageRanges
  // 写进 ocr.page_ranges），所以收起面板绝不能顺手清掉用户填的范围。
  assert.equal(services.stores.uploadView.getSnapshot().pageRangeStart, "2");
  assert.equal(services.stores.uploadView.getSnapshot().pageRangeEnd, "7");

  clickWithMouseDown(dom, tab("翻译模式"));
  await waitFor(
    () => services.stores.workflowView.getSnapshot().ocrOnly === false,
    "切回翻译模式",
  );
  assert.equal(
    services.stores.uploadView.getSnapshot().pageRangeStart,
    "2",
    "切回翻译后重新展开选项，页码应当原样回显",
  );

  root.unmount();
  services.dispose();
  host.remove();
});
