import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// 书籍详情弹窗(参考 PDF_MD_lib 的 BookDetailModal)组件级测试:点卡片打开、
// 元数据渲染、阅读状态切换走 patchDocument、馆藏/已翻译的动作集不同。
//
// 每个 test 一份全新 JSDOM(同一个 jsdom 第二次 createRoot 会停摆)。

function makeDom(search = "") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: `http://localhost/index.html${search}`,
  });
  for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLFormElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) {
      return value;
    }
    await wait(15);
  }
  assert.fail(`等待超时：${description}`);
}

function click(dom, element) {
  // Radix Tabs Trigger 挂在 mousedown 上，只 dispatch click 不会切 tab
  element.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

// 控制端输入：绕开 React 的 value 追踪，用原生 setter 写入再冒泡 input
function typeInput(dom, element, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

async function bootHomeApp(dom) {
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { createHomeComposition } = await import("../../src/app/home/create-home-composition.js");
  const { HomeApp } = await import("../../src/app/home/HomeApp.jsx");

  const host = dom.window.document.createElement("div");
  host.id = "home-root";
  dom.window.document.body.appendChild(host);

  const services = createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
  });
  services.initialize();

  const root = createRoot(host);
  root.render(React.createElement(HomeApp, { services }));
  await waitFor(() => dom.window.document.getElementById("app-shell"), "HomeApp 首帧渲染");
  await wait(0);
  return { services, root, host };
}

test("馆藏卡打开书籍详情:元数据 + 阅读状态切换 + 翻译/读原文动作,无对照阅读", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="true"]'),
    "馆藏卡就位",
  );
  const documentId = card.getAttribute("data-document-id");
  click(dom, card);

  const dlg = await waitFor(() => byId("book-detail-dialog"), "书籍详情弹窗打开");
  for (const tab of ["overview", "processing", "artifacts"]) {
    assert.ok(byId(`book-detail-tab-${tab}`), `详情存在 ${tab} Tab`);
    assert.ok(byId(`book-detail-panel-${tab}`), `详情存在 ${tab} 面板`);
  }
  assert.equal(byId("book-detail-tab-translate"), null, "不再用翻译命名整个处理区");
  assert.equal(byId("book-detail-tab-more"), null, "移除含糊的更多 Tab");
  assert.equal(byId("book-detail-tab-manage"), null, "管理能力并入简介，不再占用顶级 Tab");
  assert.ok(dlg.querySelector(".book-detail-overview-hero"), "概览使用文档叙事主视觉");
  assert.match(dlg.querySelector(".book-detail-overview-page-count")?.textContent || "", /88\s*页文档/, "主视觉突出页数");
  assert.ok(byId("book-detail-overview-process-btn"), "概览可直接进入处理");
  assert.ok(byId("book-detail-overview-files-btn"), "概览可直接进入文件中心");
  assert.ok(byId("book-detail-overview-process-btn").querySelector("svg"), "处理入口使用图标");
  assert.ok(byId("book-detail-overview-files-btn").querySelector("svg"), "文件入口使用图标");
  assert.match(
    dlg.querySelector(".book-detail-cover-identity")?.textContent || "",
    /Group Theory Lecture Notes.*未知作者/,
    "左栏展示文档身份与作者兜底",
  );
  assert.equal(dlg.querySelector(".book-detail-left-reading-card"), null, "左栏不再展示阅读状态");
  for (const kind of ["source", "markdown", "translated", "comparison"]) {
    assert.ok(byId(`book-detail-download-${kind}-btn`), `左栏存在 ${kind} 快捷下载图标`);
  }
  assert.equal(byId("book-detail-download-source-btn").disabled, false, "原始 PDF 可直接下载");
  assert.equal(byId("book-detail-download-markdown-btn").disabled, true, "未生成 Markdown 时入口置灰");
  // 标题默认是只读大标题(不是常驻输入框),编辑才出现输入框
  await waitFor(() => dlg.querySelector(".book-detail-title")?.textContent?.trim(), "标题就位");
  assert.equal(byId("book-detail-title-input"), null, "默认只读,无标题输入框");
  assert.ok(
    dlg.querySelector('[data-processing-capability="translation"] .book-detail-status')?.textContent.includes("未翻译"),
    "馆藏显示未翻译",
  );
  // 未翻译：标题状态 + 紧凑启动行（尚无真实 job，不嵌路线图或完整 StatusCard）
  assert.equal(byId("book-detail-translate-progress"), null, "空闲态不占用进度区域");
  assert.equal(byId("book-detail-stage-flow"), null, "空闲态不展示静态阶段路线图");
  assert.equal(byId("book-detail-job-status-card"), null, "未翻译不嵌 StatusCard");
  // 馆藏:有翻译 + 读原文,无对照阅读
  assert.ok(byId("book-detail-translate-btn"), "馆藏有翻译按钮");
  assert.ok(byId("book-detail-start-ocr-btn"), "馆藏有独立 OCR 按钮");
  assert.ok(byId("book-detail-ocr-progress"), "OCR 使用独立任务状态区");
  assert.ok(dlg.querySelector(".book-detail-ocr-range"), "OCR 指定页码以内联一行提供，不再折叠进选项");
  assert.ok(byId("book-detail-read-source-btn"), "有读原文");
  assert.equal(byId("book-detail-compare-btn"), null, "馆藏没有对照阅读");
  click(dom, byId("book-detail-tab-artifacts"));
  await waitFor(() => byId("book-detail-panel-artifacts").hidden === false, "切到文件 Tab");
  assert.ok(byId("book-detail-open-source-file-btn"), "文件 Tab 展示源 PDF 动作");
  // 点"编辑"进入标题/标签编辑
  click(dom, byId("book-detail-tab-overview"));
  await waitFor(() => byId("book-detail-panel-overview").hidden === false, "回到简介 Tab");
  click(dom, byId("book-detail-edit-btn"));
  await waitFor(() => byId("book-detail-title-input"), "点编辑出现标题输入框");

  // 阅读状态切换 → patchDocument(mock),按钮变激活
  assert.ok(dlg.querySelector('[data-book-detail-section="management"]'), "简介内展示阅读与归档区");
  const { getMockDocument } = await import("@/platform/mock/documents.js");
  const readBtns = dlg.querySelectorAll(".book-detail-reading-btn");
  const doneBtn = Array.from(readBtns).find((b) => b.textContent === "读完");
  click(dom, doneBtn);
  await waitFor(() => doneBtn.classList.contains("is-active"), "读完变激活");
  await waitFor(() => getMockDocument(documentId).reading_status === "done", "patchDocument 落库 reading_status=done");

  root.unmount();
  services.dispose();
  host.remove();
});

test("已翻译卡打开书籍详情:有对照阅读,无翻译按钮", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  // mock 里 att-001/scl-002 等合成 book 是 succeeded 的已翻译文档
  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="false"][data-status="succeeded"]'),
    "已翻译卡就位",
  );
  click(dom, card);

  const dlg = await waitFor(() => byId("book-detail-dialog"), "书籍详情弹窗打开");
  assert.equal(
    byId("book-detail-tab-overview")?.getAttribute("data-state"),
    "active",
    "点击已翻译书籍卡仍默认进入概览",
  );
  // 默认在「简介」：不应弹出工作流对话框
  assert.equal(
    services.stores.dialog.getSnapshot().open,
    false,
    "打开书籍详情不得自动打开工作流弹窗",
  );
  // 已完成任务保留紧凑过程条，但不恢复占高的历史流程大卡。
  await waitFor(
    () => dlg.querySelector('[data-processing-capability="translation"] .book-detail-status')?.textContent?.includes("已完成"),
    "显示已完成",
  );
  assert.match(
    dlg.querySelector('[data-processing-capability="ocr"]')?.textContent || "",
    /已完成/,
    "整本翻译完成同时证明 OCR 已完成，不得显示未执行",
  );
  assert.equal(byId("book-detail-job-status-card"), null, "完成态不展示历史流程大卡");
  assert.equal(byId("book-detail-translate-progress"), null, "完成态不占用进度区域");
  const completedProcess = dlg.querySelector('[data-translation-process="true"]');
  assert.ok(completedProcess, "完成态展示紧凑翻译过程");
  assert.equal(completedProcess.querySelectorAll("[data-stage-key]").length, 4, "过程包含 OCR/翻译/渲染/完成");
  assert.equal(completedProcess.querySelector('[data-stage-key="done"]')?.getAttribute("data-state"), "done");
  // 仍然不得弹工作流
  assert.equal(
    services.stores.dialog.getSnapshot().open,
    false,
    "切换进度 Tab / 加载进度后仍不打开工作流弹窗",
  );
  assert.ok(byId("book-detail-compare-btn"), "已翻译有对照阅读");
  assert.equal(byId("book-detail-translate-btn"), null, "已翻译没有翻译按钮");
  const retryTranslationButton = await waitFor(
    () => byId("book-detail-retry-translation-btn"),
    "后端阶段动作加载重新翻译按钮",
  );
  const retryRenderButton = await waitFor(
    () => {
      const button = byId("book-detail-retry-render-btn");
      return button && !button.disabled ? button : null;
    },
    "后端阶段动作加载可用的重新渲染按钮",
  );
  assert.ok(retryTranslationButton, "已完成任务可以复用 OCR 重新翻译");
  assert.ok(retryRenderButton, "已有译文可以单独重新渲染");
  assert.ok(byId("book-detail-read-source-btn"), "仍可读原文");

  const sourceDocumentId = services.bookDetail.dialogStore.getState().payload.document_id;
  click(dom, retryRenderButton);
  await waitFor(
    () => `${services.bookDetail.dialogStore.getState().payload.active_job_id || ""}`.startsWith("mock-render-retry-"),
    "重新渲染创建新任务并接入详情",
  );
  assert.equal(
    services.bookDetail.dialogStore.getState().payload.document_id,
    sourceDocumentId,
    "阶段重试继续绑定原文档",
  );
  await waitFor(
    () => dlg.querySelector('[data-processing-capability="translation"] .book-detail-status')?.textContent?.includes("处理中"),
    "外层翻译状态立即进入处理中",
  );

  root.unmount();
  services.dispose();
  host.remove();
});

test("书籍详情:后台轮询换 item 引用不覆盖正在编辑的标题", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="true"]'),
    "馆藏卡就位",
  );
  const documentId = card.getAttribute("data-document-id");
  click(dom, card);
  await waitFor(() => byId("book-detail-dialog"), "详情弹窗打开");

  click(dom, byId("book-detail-edit-btn"));
  const input = await waitFor(() => byId("book-detail-title-input"), "编辑输入框就位");
  typeInput(dom, input, "用户正在输入的标题");

  // 模拟后台轮询：同一卡片换一个新对象引用（内容不变）。
  const items = services.library.recentJobsStore.getSnapshot().items || [];
  const row = items.find((item) => `${item.document_id || ""}`.trim() === `${documentId || ""}`.trim());
  assert.ok(row, "前置：store 里有该文档行");
  services.library.recentJobsStore.actions.replaceItem({ ...row });
  await wait(30);

  assert.equal(
    byId("book-detail-title-input")?.value,
    "用户正在输入的标题",
    "后台换 item 引用不得重置正在编辑的标题",
  );

  root.unmount();
  services.dispose();
  host.remove();
});

test("书籍详情:删除被收藏挡住 → 二次确认清空收藏后删除", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  const { MOCK_DOCUMENT_ID } = await import("@/platform/mock/documents.js");
  const card = await waitFor(
    () => dom.window.document.querySelector(`#recent-jobs-list [data-document-id="${MOCK_DOCUMENT_ID}"]`),
    "带收藏的文档卡就位",
  );
  click(dom, card);
  await waitFor(() => byId("book-detail-dialog"), "详情弹窗打开");

  await waitFor(() => byId("book-detail-delete-btn"), "删除按钮就位");
  click(dom, byId("book-detail-delete-btn"));
  await waitFor(() => byId("book-detail-delete-confirm"), "第一层删除确认");
  click(dom, byId("book-detail-delete-confirm-confirm"));

  await waitFor(() => byId("book-detail-clear-favorites-confirm"), "收藏保护二次确认");
  assert.match(
    byId("book-detail-clear-favorites-confirm").textContent,
    /2\s*条收藏/,
    "二次确认展示结构化 favorite_count",
  );
  click(dom, byId("book-detail-clear-favorites-confirm-confirm"));
  await waitFor(() => !byId("book-detail-dialog"), "清空收藏后删除成功并关闭弹窗");

  root.unmount();
  services.dispose();
  host.remove();
});

test("进度 Tab：运行中的真实 OCR 任务提供取消，派生 OCR 不提供", async () => {
  const dom = makeDom();
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { BookDetailProcessingTab } = await import(
    "../../src/features/book-detail/ui/tabs/BookDetailProcessingTab.jsx"
  );

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  const cancelCalls = [];
  const translation = {
    item: {},
    status: { label: "尚未翻译", tone: "muted" },
    isActive: false,
    canTranslate: true,
    rangeOn: false,
    startPage: "1",
    endPage: "",
    onRangeOnChange() {},
    onStartPageChange() {},
    onEndPageChange() {},
    onTranslate() {},
    onRetryStage: async () => {},
  };
  const render = (ocrJob) => root.render(React.createElement(BookDetailProcessingTab, {
    ocr: {
      job: ocrJob,
      pending: false,
      cancelling: false,
      error: "",
      rangeOn: false,
      startPage: "1",
      endPage: "",
      onRangeOnChange() {},
      onStartPageChange() {},
      onEndPageChange() {},
      onOcr() {},
      onCancel: (id) => cancelCalls.push(id),
    },
    translation,
  }));

  render({ job_id: "job-ocr-run", workflow: "ocr", status: "running" });
  await waitFor(() => dom.window.document.getElementById("book-detail-cancel-ocr-btn"), "真实 OCR 运行中显示取消");
  const cancelBtn = dom.window.document.getElementById("book-detail-cancel-ocr-btn");
  assert.equal(cancelBtn.disabled, false);
  click(dom, cancelBtn);
  assert.deepEqual(cancelCalls, ["job-ocr-run"], "取消按钮带真实 OCR job_id");

  // 翻译派生的合成 OCR（ocr_status_derived）job_id 指向翻译任务，不能提供取消
  render({ job_id: "job-translation", workflow: "ocr", status: "running", ocr_status_derived: true });
  await wait(20);
  assert.equal(
    dom.window.document.getElementById("book-detail-cancel-ocr-btn"),
    null,
    "派生 OCR 不提供取消按钮",
  );

  root.unmount();
  host.remove();
});

test("详情右栏:defaultTab 变化会切到对应 Tab", async () => {
  const dom = makeDom();
  const byId = (id) => dom.window.document.getElementById(id);
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { BookDetailRightTabs } = await import(
    "../../src/features/book-detail/ui/tabs/BookDetailRightTabs.jsx"
  );

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  const render = (defaultTab) => root.render(
    React.createElement(BookDetailRightTabs, {
      open: true,
      resetKey: "doc-1",
      defaultTab,
      overviewTab: React.createElement("div", { id: "tab-overview-content" }),
      processingTab: React.createElement("div", { id: "tab-processing-content" }),
      artifactsTab: React.createElement("div", { id: "tab-artifacts-content" }),
    }),
  );

  render("overview");
  await waitFor(() => byId("book-detail-panel-overview"), "概览面板就位");
  assert.equal(byId("book-detail-tab-overview").getAttribute("data-state"), "active", "初始在概览");

  render("processing");
  await waitFor(
    () => byId("book-detail-tab-processing").getAttribute("data-state") === "active",
    "defaultTab 变化后切到进度 Tab",
  );

  root.unmount();
  host.remove();
});
