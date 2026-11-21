import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { bindRerunButton } from "../../src/features/job-detail/domain/page/resume.js";

// 整页恢复两步确认：翻译歧义的 409 后不再弹 window.confirm，同一按钮二次点击才显式重跑。
const AMBIGUOUS_409 = "translation request outcome is ambiguous; retry with accept_duplicate_risk(409)";
function setupDom() {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="detail-rerun-btn">断点恢复/重新运行</button><p id="detail-rerun-status"></p></body></html>',
    { url: "http://localhost/detail.html?job_id=job-1" },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

function setText(id, text) {
  const el = globalThis.document.getElementById(id);
  if (el) el.textContent = text;
}

function bind({ submit }) {
  bindRerunButton({
    detailPageState: { job: { job_id: "job-1" } },
    getJobId: () => "job-1",
    resumePort: { submit },
    setText,
  });
  return globalThis.document.getElementById("detail-rerun-btn");
}

test("翻译歧义的 409 首击只提示二次确认，不直接重跑", async () => {
  setupDom();
  let submits = 0;
  const button = bind({
    submit: async () => {
      submits += 1;
      throw new Error(AMBIGUOUS_409);
    },
  });
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(submits, 1);
  assert.match(
    globalThis.document.getElementById("detail-rerun-status").textContent,
    /再点一次按钮确认/,
  );
  assert.equal(button.dataset.confirmRisk, "1");
  assert.equal(button.disabled, false);
});

test("二次点击才调 retry-stage，失败清确认态并可再点", async () => {
  setupDom();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "boom" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
  try {
    let submits = 0;
    const button = bind({
      submit: async () => {
        submits += 1;
        throw new Error(AMBIGUOUS_409);
      },
    });
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(submits, 1, "确认态下不再走通用恢复提交");
    assert.equal(button.dataset.confirmRisk, "", "失败后清确认态");
    assert.equal(button.disabled, false, "失败后按钮可再点");
    assert.match(
      globalThis.document.getElementById("detail-rerun-status").textContent,
      /boom/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("别的 409（任务在跑、版本过期）直接展示，不进入重复风险确认", async () => {
  for (const text of ["job is running; cancel it first(409)", "revision stale(409)"]) {
    setupDom();
    const button = bind({
      submit: async () => {
        throw Object.assign(new Error(text), { status: 409 });
      },
    });
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(globalThis.document.getElementById("detail-rerun-status").textContent, text);
    assert.notEqual(button.dataset.confirmRisk, "1", `${text} 不该当成翻译歧义`);
    assert.equal(button.disabled, false);
  }
});

test("非 409 错误直接展示，不进入确认态", async () => {
  setupDom();
  const button = bind({
    submit: async () => {
      throw new Error("network down");
    },
  });
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.match(
    globalThis.document.getElementById("detail-rerun-status").textContent,
    /network down/,
  );
  assert.notEqual(button.dataset.confirmRisk, "1");
});
