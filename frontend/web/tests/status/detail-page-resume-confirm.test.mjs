import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { bindRerunButton } from "../../src/features/job-detail/domain/page/resume.js";

// 整页恢复两步确认：409 后不再弹 window.confirm，同一按钮二次点击才显式重跑。
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
    detailPageState: { job: { job_id: "job-1" }, rerunActionUrl: "" },
    getJobId: () => "job-1",
    resumePort: { submit },
    setText,
  });
  return globalThis.document.getElementById("detail-rerun-btn");
}

test("409 首击只提示二次确认，不直接重跑", async () => {
  setupDom();
  let submits = 0;
  const button = bind({
    submit: async () => {
      submits += 1;
      throw new Error("revision stale(409)");
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
        throw new Error("revision stale(409)");
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
