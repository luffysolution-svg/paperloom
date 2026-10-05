// 翻译诊断 tab 的状态契约。三条都曾经坏过，共同特征是「不会报错，只会骗人」。

import test from "node:test";
import assert from "node:assert/strict";

const { createStatusDetailTranslationDataPort } = await import(
  "../../src/features/job-detail/domain/dialog/translation-data-port.js"
);
const { createTranslationState } = await import(
  "../../src/features/job-detail/domain/dialog/translation-state.js"
);

function makePort({ jobId = "job_1", replayDelay = 0, replayResult = "R" } = {}) {
  let currentJob = jobId;
  const translationState = createTranslationState();
  translationState.jobId = jobId;
  const calls = { replay: 0 };
  const port = createStatusDetailTranslationDataPort({
    translationState,
    apiPrefix: "/api/v1",
    currentJobId: () => currentJob,
    fetchTranslationDiagnostics: async () => ({ summary: { status_summary: {} } }),
    fetchTranslationItems: async () => ({ items: [], total: 0 }),
    fetchTranslationItem: async (_prefix, _job, itemId) => ({ item_id: itemId }),
    replayTranslationItem: async (_job, itemId) => {
      calls.replay += 1;
      if (replayDelay) await new Promise((r) => setTimeout(r, replayDelay));
      return { item_id: itemId, result: replayResult };
    },
  });
  return { port, calls, setJob: (next) => { currentJob = next; } };
}

// --- 1. replay 的迟到结果不得贴到别的条目上 ---------------------------------
//
// 重放会真的跑一次翻译，窗口以秒计。loadSummary / readItems / loadItem 都有
// token + jobId 双校验，唯独 replaySelectedItem 一行守卫都没有，于是请求在途时
// 改选条目，A 的重放结果会写进 B 的详情，状态栏还显示「重放完成」。

test("重放期间改选条目，迟到的结果不会贴到新条目上", async () => {
  const { port } = makePort({ replayDelay: 40, replayResult: "A 的结果" });
  port.state.selectedItemId = "item-A";

  const inflight = port.replaySelectedItem();
  // 结果回来之前切到另一个条目
  port.state.selectedItemId = "item-B";
  await inflight;

  assert.equal(
    port.state.replay,
    null,
    "A 的重放结果不该落到当前选中的 item-B 上",
  );
});

test("重放期间切换任务，结果同样被丢弃", async () => {
  const { port, setJob } = makePort({ replayDelay: 40 });
  port.state.selectedItemId = "item-A";

  const inflight = port.replaySelectedItem();
  setJob("job_2");
  await inflight;

  assert.equal(port.state.replay, null, "跨任务的迟到重放结果必须丢弃");
});

test("正常重放（期间没有任何切换）仍然写入结果", async () => {
  const { port } = makePort({ replayResult: "ok" });
  port.state.selectedItemId = "item-A";
  const result = await port.replaySelectedItem();
  assert.equal(result.result, "ok");
  assert.equal(port.state.replay.result, "ok", "无竞态时不能误伤正常路径");
});

// --- 2. applyQuery 不得在发请求前就宣称已加载 -------------------------------
//
// 旧代码在 applyQuery 末尾置 loaded = true，而 applyFilter 的失败路径不回滚。
// 于是诊断 404 的任务点一次「刷新」后 loaded 永久为真，ensureTranslationData 的
// `loaded && !force` 短路生效 → 之后怎么切 tab 都只重放旧状态，屏幕停在一屏全 0。

test("applyQuery 只改查询条件，不宣称数据已加载", () => {
  const { port } = makePort();
  assert.equal(port.state.loaded, false, "初始未加载");

  port.applyQuery({ finalStatus: "failed", q: "abc" });

  assert.equal(port.state.query.finalStatus, "failed");
  assert.equal(port.state.query.q, "abc");
  assert.equal(port.state.query.offset, 0, "换筛选条件要回到第一页");
  assert.equal(
    port.state.loaded,
    false,
    "此刻一个请求都还没发出去，不能置 loaded——失败后会把面板永久卡在错误态",
  );
});

test("markLoaded 仍是置位 loaded 的唯一入口", () => {
  const { port } = makePort();
  port.applyQuery({ finalStatus: "", q: "" });
  assert.equal(port.state.loaded, false);
  port.markLoaded();
  assert.equal(port.state.loaded, true);
});

// --- 3. 翻页失败要把 offset 退回去 ------------------------------------------
//
// changePage 是先就地改 query 再发请求。不回滚的话列表区显示错误、而分页 meta
// 已经写着新页码，「上一页/下一页」的可用状态跟着错位。

test("changePage 就地推进 offset，供调用方在失败时回滚", () => {
  const { port } = makePort();
  port.state.query.limit = 20;
  port.state.query.offset = 0;

  assert.equal(port.changePage("next"), true);
  assert.equal(port.state.query.offset, 20);

  // 调用方（coordinator）在请求失败时负责还原
  port.state.query.offset = 0;
  assert.equal(port.state.query.offset, 0);

  // 已在首页时不产生无谓请求
  assert.equal(port.changePage("prev"), false, "首页再往前翻应当返回 false");
});
