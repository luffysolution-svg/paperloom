// 书籍详情里「点名看某个任务」的入口，必须真的打开那个任务。
//
// 曾经的 bug：ReaderNavigation 收到 openReaderRequested 后，只要带 documentId 就先问
// /documents/:id/reading，拿整本最新的成功译文换掉调用方给的 job_id。于是「文件」页
// OCR 与结构化的「查看」打开的是翻译任务、进度页「查看实时译文」在重翻时打开旧译文。
//
// 修法：这些入口在事件 detail 上带 pinJob: true，ReaderNavigation 原样打开；只有封面
// 「对照阅读」、书卡阅读这类「看这本书」的入口继续按整本挑。
import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "../helpers/async.mjs";
import { clickWithMouseDown, makeDom } from "../helpers/dom.mjs";
import { bootHomeApp } from "../helpers/home-app.mjs";

const click = (dom, element) => clickWithMouseDown(dom, element, { cancelable: true });

async function openTranslatedBook(dom) {
  const byId = (id) => dom.window.document.getElementById(id);
  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="false"][data-status="succeeded"]'),
    "已翻译卡就位",
  );
  click(dom, card);
  await waitFor(() => byId("book-detail-dialog"), "书籍详情弹窗打开");
  return byId;
}

async function recordOpenReader(dom) {
  const { APP_EVENTS } = await import("@/platform/contracts/app-contract.js");
  const requests = [];
  dom.window.document.addEventListener(APP_EVENTS.openReaderRequested, (event) => {
    requests.push({ ...(event.detail || {}) });
  });
  return requests;
}

test("「文件」页按任务分组的「查看」（含 OCR 与结构化）：点名打开那个任务（pinJob），不按整本改写", async () => {
  const dom = makeDom("?mock=parallel");
  const { services, root, host } = await bootHomeApp(dom);
  const requests = await recordOpenReader(dom);
  const byId = await openTranslatedBook(dom);

  click(dom, byId("book-detail-tab-artifacts"));
  await waitFor(() => byId("book-detail-panel-artifacts")?.hidden === false, "切到文件 Tab");
  // mock 数据里 OCR 不一定单独成组；任一分组的「查看」都是同一个 onOpenJob 入口。
  const openJob = await waitFor(
    () => byId("book-detail-open-ocr-file-btn")
      || byId("book-detail-panel-artifacts")?.querySelector(".book-detail-artifact-group-open"),
    "按任务分组的「查看」就位",
  );
  click(dom, openJob);

  await waitFor(() => requests.length > 0, "派发了打开阅读事件");
  assert.ok(requests[0].jobId, "带上了被点名的 job_id");
  assert.ok(requests[0].documentId, "仍带 documentId");
  assert.equal(requests[0].pinJob, true, "OCR「查看」是点名看某个任务，必须带 pinJob");

  root.unmount();
  services.dispose();
  host.remove();
});

test("封面「对照阅读」是看这本书：不带 pinJob，继续由后端按整本挑", async () => {
  const dom = makeDom("?mock=parallel");
  const { services, root, host } = await bootHomeApp(dom);
  const requests = await recordOpenReader(dom);
  const byId = await openTranslatedBook(dom);

  const compare = await waitFor(() => byId("book-detail-compare-btn"), "已翻译有对照阅读");
  click(dom, compare);

  await waitFor(() => requests.length > 0, "派发了打开阅读事件");
  assert.ok(requests[0].documentId, "带 documentId 供后端按整本挑");
  assert.notEqual(requests[0].pinJob, true, "看这本书的入口不能固定任务");

  root.unmount();
  services.dispose();
  host.remove();
});
