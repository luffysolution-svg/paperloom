// 书目身份归服务端，运行态归补丁表。
//
// 曾经的 bug：改完书名，网格上的标题闪一下新的、然后变回旧的。
//
// 链条是这样的：
//   1. 书跑过一次任务 → runtimeJobPatches 里留下一条补丁。stampBookIdentity
//      （runtime-patch-merge.ts）会把**当时卡片上的标题**一并抄进补丁。
//   2. 用户改名 → update-document.ts 先 patchLibraryDocumentItem 乐观写
//      （标题立刻变新），紧接着 void reload({reset:true, silent:true})。
//   3. reload → commitRecentJobsPage → mergeRuntimePatches：服务端行带新标题，
//      补丁带旧标题，而 mergeLibraryJobItem 的 pickBookTitle 规则是
//      「next（补丁）非占位符就赢」→ 旧标题盖回去。
//
// 同一机制的第二个受害者是 documentAutoNaming：任务成功后后端改了标题，
// 下一次全量刷新同样被终态补丁里的旧标题盖回。
//
// 为什么修在「剥掉补丁的身份字段」而不是「清理补丁表」：
// 补丁表确实从不清理（runtime-patch-commands.ts 里唯一的 delete 只在换 job_id
// 时删旧键），但即便它被及时清理，「补丁生成之后才发生的改名」仍然会被盖。
// 根因是补丁越权携带了身份字段，不是它活得太久。
//
// 三条用例分别锁住：修复本身、兜底不被误伤、补丁表的正当职责不被误伤。

import test from "node:test";
import assert from "node:assert/strict";

const { mergeRuntimePatches } = await import(
  "../../src/features/library/domain/recent-jobs/runtime-item.js"
);

const OPTIONS = { stageAdapterPort: undefined };

test("服务端有标题时，补丁里的旧标题不得盖回去", () => {
  const serverItems = [{
    job_id: "job-1",
    document_id: "doc-1",
    title: "用户刚改的新名",
    display_name: "用户刚改的新名",
    status: "succeeded",
  }];
  const patches = new Map([["job-1", {
    job_id: "job-1",
    document_id: "doc-1",
    title: "补丁生成那一刻的旧名",
    display_name: "补丁生成那一刻的旧名",
    status: "succeeded",
  }]]);

  const [merged] = mergeRuntimePatches(serverItems, patches, OPTIONS);
  assert.equal(merged.title, "用户刚改的新名", "改名被旧补丁盖回去了");
  assert.equal(merged.display_name, "用户刚改的新名");
});

test("服务端还没有名字时，补丁仍然兜底（stampBookIdentity 的本意）", () => {
  // 刚建卡、服务端投影还没带上书目身份的情形：这时补丁是唯一的名字来源，
  // 剥掉它会让网格上出现一张无名卡。
  const serverItems = [{ job_id: "job-2", document_id: "doc-2", status: "running" }];
  const patches = new Map([["job-2", {
    job_id: "job-2",
    document_id: "doc-2",
    title: "来自补丁的兜底名",
    status: "running",
  }]]);

  const [merged] = mergeRuntimePatches(serverItems, patches, OPTIONS);
  assert.equal(merged.title, "来自补丁的兜底名", "服务端没名字时不该把补丁的兜底身份也剥掉");
});

test("补丁的运行态照旧覆盖服务端的旧状态（补丁表的正当职责）", () => {
  // 全量刷新拿回来的服务端行可能比正在跑的任务旧，补丁把运行态盖回去是对的。
  // 这条用例保证上面的修复只剥身份字段，没有误伤运行态。
  const serverItems = [{
    job_id: "job-3",
    document_id: "doc-3",
    title: "书名",
    status: "queued",
  }];
  const patches = new Map([["job-3", {
    job_id: "job-3",
    document_id: "doc-3",
    title: "书名",
    status: "running",
  }]]);

  const [merged] = mergeRuntimePatches(serverItems, patches, OPTIONS);
  assert.equal(merged.status, "running", "补丁的运行态必须仍然赢过服务端的旧状态");
  assert.equal(merged.title, "书名");
});
