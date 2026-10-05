/**
 * 引用 [n] 的悬停预览。
 *
 * 钉三件事：
 * 1) 缩略图是受保护资源——必须走 fetchProtected + blob，绝不能把 API URL 直接塞进
 *    <img src>（那是 401），而且卡片收起时必须把 blob URL 收回去；
 * 2) 拿不到 jobId 时（主页的 citation 常常没有 job_id）一张预览请求都不许发，
 *    也不许出破图，只留 snippet；
 * 3) 卡片贴着视口边时要翻边/夹回，不能开到屏幕外。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, beforeEach, afterEach } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
for (const key of [
  "window", "document", "HTMLElement", "Element", "Node", "Event", "CustomEvent",
  "MouseEvent", "DocumentFragment", "MutationObserver", "NodeFilter",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window, writable: true, configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// —— blob URL 账本：创建和回收都记下来，用来验证没有泄漏 ——
const blobUrls = { created: [], revoked: [] };
let blobSeq = 0;
for (const target of [dom.window.URL, globalThis.URL]) {
  target.createObjectURL = () => {
    const url = `blob:mock/${++blobSeq}`;
    blobUrls.created.push(url);
    return url;
  };
  target.revokeObjectURL = (url) => { blobUrls.revoked.push(url); };
}

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const answerEnhance = await import(
  "../../../packages/reader/src/shared/ai/answer-enhance.ts"
);
const { AiMarkdownAnswer } = await import(
  "../../../packages/reader/src/components/ai/AiMarkdownAnswer.tsx"
);
const { computeHoverCardPosition } = await import(
  "../../../packages/reader/src/shared/ai/hover-card-position.ts"
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = (ms = 320) => act(async () => { await sleep(ms); });

/** 记录所有受保护请求；默认全部成功返回一张假图。 */
const fetched = [];
let fetchBehaviour = () => ({ ok: true, status: 200, blob: async () => ({ size: 1 }) });

answerEnhance.setAnswerEnhanceAdapters({
  resolveResourceUrl: (value) => `http://api.test${`${value ?? ""}`}`,
  fetchProtected: async (url) => {
    fetched.push(`${url}`);
    return fetchBehaviour(`${url}`);
  },
});

const CITATION = {
  ref: 1,
  block_id: "p005-b0001",
  page_idx: 4,
  job_id: "job-abc",
  snippet: "信赖域方法在每一步都限制步长上界。",
};

async function render(props) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(AiMarkdownAnswer, {
      content: "结论见 [1]。",
      streaming: false,
      citations: [CITATION],
      ...props,
    }));
  });
  await settle();
  return {
    host,
    unmount: async () => { await act(async () => { root.unmount(); }); host.remove(); },
  };
}

const refButton = (host) => host.querySelector("button.reader-ai-citation-ref");
const card = () => dom.window.document.querySelector(".reader-ai-citation-card");
const cardThumb = () => dom.window.document.querySelector(".reader-ai-citation-card-thumb");

function mouseOver(el) {
  el.dispatchEvent(new dom.window.MouseEvent("mouseover", { bubbles: true }));
}
function mouseOut(el, relatedTarget = null) {
  el.dispatchEvent(new dom.window.MouseEvent("mouseout", { bubbles: true, relatedTarget }));
}

beforeEach(() => {
  fetched.length = 0;
  blobUrls.created.length = 0;
  blobUrls.revoked.length = 0;
  fetchBehaviour = () => ({ ok: true, status: 200, blob: async () => ({ size: 1 }) });
});

afterEach(() => {
  for (const stray of dom.window.document.querySelectorAll(".reader-ai-citation-card")) {
    stray.remove();
  }
});

describe("引用悬停预览", () => {
  it("鼠标停在 [1] 上才出卡片，没停之前页面上没有卡片", async () => {
    const view = await render({ jobId: "job-abc" });
    assert.ok(refButton(view.host), "[1] 没渲染成引用角标");
    assert.equal(card(), null, "还没悬停就冒出了卡片");

    mouseOver(refButton(view.host));
    await settle();
    assert.ok(card(), "悬停后没有出卡片");
    assert.ok(
      card().textContent.includes("信赖域方法"),
      `卡片里没有 snippet: ${card().textContent}`,
    );
    assert.ok(card().textContent.includes("第 5 页"), "卡片没标出来源页码");
    await view.unmount();
  });

  it("缩略图走 fetchProtected + blob，不是把 API URL 直接塞给 <img src>", async () => {
    const view = await render({ jobId: "job-abc" });
    mouseOver(refButton(view.host));
    await settle();

    const requested = fetched.filter((url) => url.includes("/preview/pages/"));
    assert.equal(requested.length, 1, `预览请求次数不对: ${JSON.stringify(fetched)}`);
    assert.match(requested[0], /\/api\/v1\/jobs\/job-abc\/preview\/pages\/5\?/);
    assert.match(requested[0], /width=240/);

    const img = cardThumb();
    assert.ok(img, "卡片里没有缩略图");
    assert.ok(
      img.getAttribute("src").startsWith("blob:"),
      `缩略图 src 不是 blob，会 401: ${img.getAttribute("src")}`,
    );
    assert.equal(blobUrls.created.length, 1);
    await view.unmount();
  });

  it("卡片收起后回收 blob URL——不回收就是每次悬停泄一张图", async () => {
    const view = await render({ jobId: "job-abc" });
    const button = refButton(view.host);
    mouseOver(button);
    await settle();
    assert.equal(blobUrls.created.length, 1, "没有创建 blob，本用例失去意义");
    assert.deepEqual(blobUrls.revoked, [], "卡片还开着就把 blob 回收了");

    mouseOut(button);
    await settle();
    assert.equal(card(), null, "移开鼠标后卡片没收起");
    assert.deepEqual(
      blobUrls.revoked, blobUrls.created,
      "卡片收起了，blob URL 没被回收（泄漏）",
    );
    await view.unmount();
  });

  it("整个回答卸载时也要回收 blob URL", async () => {
    const view = await render({ jobId: "job-abc" });
    mouseOver(refButton(view.host));
    await settle();
    assert.equal(blobUrls.created.length, 1);
    await view.unmount();
    assert.deepEqual(blobUrls.revoked, blobUrls.created, "卸载时 blob URL 没回收");
  });

  it("鼠标从 [1] 挪到卡片上，卡片不许消失（不然根本选不中里面的文字）", async () => {
    const view = await render({ jobId: "job-abc" });
    const button = refButton(view.host);
    mouseOver(button);
    await settle();
    const opened = card();
    assert.ok(opened);

    mouseOut(button, opened);
    mouseOver(opened);
    await settle();
    assert.ok(card(), "从角标挪到卡片上就把卡片关了");
    await view.unmount();
  });

  it("点击照旧跳页，并且把卡片收掉", async () => {
    const jumps = [];
    const view = await render({ jobId: "job-abc", onJumpCitation: (c) => jumps.push(c) });
    const button = refButton(view.host);
    mouseOver(button);
    await settle();
    assert.ok(card());

    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await settle();
    assert.equal(jumps.length, 1, "点击没有触发跳页");
    assert.equal(jumps[0].block_id, "p005-b0001");
    assert.equal(card(), null, "跳页之后卡片还挂在屏幕上");
    await view.unmount();
  });
});

describe("拿不到 jobId 的引用（主页常见）", () => {
  const NO_JOB = { ...CITATION, job_id: undefined };

  it("一张预览请求都不发，也不留破图", async () => {
    const view = await render({ jobId: "", citations: [NO_JOB] });
    mouseOver(refButton(view.host));
    await settle();

    assert.ok(card(), "没 jobId 也应该出纯文字卡片");
    assert.deepEqual(
      fetched.filter((url) => url.includes("/preview/pages/")), [],
      "没有 jobId 却还是发了预览请求（拼出来的 URL 必然打不开）",
    );
    assert.equal(cardThumb(), null, "没有 jobId 却渲染了 <img>，会是一张破图");
    assert.ok(card().textContent.includes("信赖域方法"), "纯文字卡片里连 snippet 都没有");
    await view.unmount();
  });

  it("既没有 jobId 也没有 snippet 时，干脆不出卡片", async () => {
    const bare = { ref: 1, block_id: "p005-b0001", page_idx: 4 };
    const view = await render({ jobId: "", citations: [bare] });
    mouseOver(refButton(view.host));
    await settle();
    assert.equal(card(), null, "没有任何内容可显示，却弹了一张空卡片");
    await view.unmount();
  });
});

describe("译文页取不到时的退路", () => {
  it("translated 404 就改取 source，而不是直接显示失败", async () => {
    fetchBehaviour = (url) => (
      url.includes("kind=translated")
        ? { ok: false, status: 404, blob: async () => ({ size: 0 }) }
        : { ok: true, status: 200, blob: async () => ({ size: 1 }) }
    );
    const view = await render({ jobId: "job-abc" });
    mouseOver(refButton(view.host));
    await settle();

    const kinds = fetched
      .filter((url) => url.includes("/preview/pages/"))
      .map((url) => (url.includes("kind=translated") ? "translated" : "source"));
    assert.deepEqual(kinds, ["translated", "source"], `请求顺序不对: ${kinds}`);
    assert.ok(cardThumb()?.getAttribute("src")?.startsWith("blob:"), "退回原文页也没取到图");
    await view.unmount();
  });

  it("两种都取不到时说明预览不可用，不留空白灰块", async () => {
    fetchBehaviour = () => ({ ok: false, status: 404, blob: async () => ({ size: 0 }) });
    const view = await render({ jobId: "job-abc" });
    mouseOver(refButton(view.host));
    await settle();

    const figure = dom.window.document.querySelector(".reader-ai-citation-card-figure");
    assert.equal(figure?.getAttribute("data-state"), "failed");
    assert.ok(card().textContent.includes("预览暂不可用"));
    assert.deepEqual(blobUrls.created, [], "请求都失败了却还是建了 blob");
    await view.unmount();
  });
});

describe("卡片定位", () => {
  const CARD = { width: 300, height: 160 };
  const VIEW = { width: 1000, height: 800 };

  it("正常情况开在触发点下方", () => {
    const pos = computeHoverCardPosition(
      { top: 200, left: 400, bottom: 216, width: 20 }, CARD, VIEW,
    );
    assert.equal(pos.placement, "bottom");
    assert.ok(pos.top > 216, `卡片没开在下方: top=${pos.top}`);
  });

  it("贴着视口下沿时翻到上方——不翻的话卡片一半在屏幕外", () => {
    const anchor = { top: 770, left: 400, bottom: 786, width: 20 };
    const pos = computeHoverCardPosition(anchor, CARD, VIEW);
    assert.equal(pos.placement, "top", "下方明显放不下却没有翻边");
    assert.ok(
      pos.top + CARD.height <= anchor.top,
      `翻边后仍然盖住了触发点: top=${pos.top}`,
    );
    assert.ok(pos.top >= 0, "翻到上方之后跑出了视口顶部");
  });

  it("贴着右边时向左夹回视口内", () => {
    const pos = computeHoverCardPosition(
      { top: 200, left: 985, bottom: 216, width: 20 }, CARD, VIEW,
    );
    assert.ok(
      pos.left + CARD.width <= VIEW.width,
      `卡片右边缘出了视口: left=${pos.left}`,
    );
  });

  it("贴着左边时向右夹回视口内", () => {
    const pos = computeHoverCardPosition(
      { top: 200, left: 0, bottom: 216, width: 20 }, CARD, VIEW,
    );
    assert.ok(pos.left >= 0, `卡片左边缘出了视口: left=${pos.left}`);
  });

  it("卡片比视口还高时也不会整张跑出屏幕", () => {
    const pos = computeHoverCardPosition(
      { top: 400, left: 400, bottom: 416, width: 20 },
      { width: 300, height: 900 },
      VIEW,
    );
    assert.ok(pos.top >= 0 && pos.top < VIEW.height, `top=${pos.top}`);
  });
});

describe("定位真的接到了卡片上", () => {
  it("视口变化时按新的 rect 重算 left/top", async () => {
    const view = await render({ jobId: "job-abc" });
    const button = refButton(view.host);
    mouseOver(button);
    await settle();
    const node = card();
    assert.ok(node, "卡片没出来");

    // jsdom 里所有 rect 都是 0，手动给出「贴着视口下沿」的几何，再触发一次重算。
    button.getBoundingClientRect = () => ({
      top: 760, left: 900, bottom: 776, right: 920, width: 20, height: 16,
    });
    node.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 160, right: 300, width: 300, height: 160,
    });
    Object.defineProperty(dom.window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(dom.window, "innerHeight", { value: 800, configurable: true });
    await act(async () => {
      dom.window.dispatchEvent(new dom.window.Event("resize"));
      await sleep(20);
    });

    assert.equal(node.getAttribute("data-placement"), "top", "贴着下沿却没翻边");
    assert.ok(
      Number.parseFloat(node.style.top) + 160 <= 760,
      `翻边后的 top 不对: ${node.style.top}`,
    );
    assert.ok(
      Number.parseFloat(node.style.left) + 300 <= 1000,
      `贴着右边却没夹回来: ${node.style.left}`,
    );
    await view.unmount();
  });
});
