// 文件级 import 环门禁（Tarjan SCC）。
//
// 为什么需要它：architecture 下已有分层方向（layer-boundaries）、跨功能引用、
// CSS/DOM 等多条门禁，但**没有任何一条**检查「A 依赖 B、B 又依赖 A」的循环。
// 分层门禁只看层归属，同层内/跨层的回边绕成环时完全看不见。
//
// 统计口径（与 scripts/import-cycles.mjs 一致）：只算**值依赖**。
//   - `import type { X } from` / `export type { X } from`：整条忽略；
//   - `import { type X } from`：命名绑定全是 `type` 前缀时忽略；
//     `{ type X, Y }` 因存在值绑定 Y 仍然计入；
//   - 动态 `import("...")` 计入，但 `typeof import("x")` / `as import("x")`
//     属于 TS 的 import type 节点（类型位置），忽略。
// 如果把 type-only 也计入，会凭空得到约 40 个文件的跨层「假环」——本仓库
// 的类型引用网很密，正是要避免这种误报。因此口径必须只算值依赖。
//
// Baseline（棘轮）分两张表：
//   1. ALLOWED_CYCLES：当前**允许存在**的循环。为空表示 src 目前无值循环。
//   2. KNOWN_ELIMINATED_CYCLES：历史上存在、现已修掉的循环。它们必须保持
//      消失；一旦回归，门禁失败。两个方向一起把现状钉死：
//        - 出现不在 ALLOWED 里的新环 → 失败；
//        - ALLOWED 里的环已被修掉（不再成环）→ 失败，强制删除条目收紧；
//        - KNOWN_ELIMINATED 里的环重新出现 → 失败。

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeImportCycles,
  buildGraph,
  extractValueSpecifiers,
  findSccs,
  formatCycleSummary,
} from "../../scripts/import-cycles.mjs";

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

// 当前允许存在的值循环。目前为空：下面的 KNOWN_ELIMINATED 四条已被并行重构
// 全部拆断（credentials↔reader、jobs↔job-detail、ingest、platform/mock）。
const ALLOWED_CYCLES = [];

// 修复前（HEAD 65ac0094）真实存在的四条**值依赖**循环，现要求保持消失。
// members 为规范化成员集合；注释里的 `→` 链是当时的主要回边。
const KNOWN_ELIMINATED_CYCLES = [
  {
    name: "credentials ↔ reader",
    // domain → domain/browser → domain/save-flow → reader/domain
    //   → reader/domain/host/ai → domain
    members: [
      "src/features/credentials/domain.ts",
      "src/features/credentials/domain/browser.ts",
      "src/features/credentials/domain/save-flow.ts",
      "src/features/reader/domain.ts",
      "src/features/reader/domain/host/ai.ts",
    ],
  },
  {
    name: "jobs ↔ job-detail",
    // job-detail/index → status-detail-runtime-port → jobs/index
    //   → jobs/runtime/controller → jobs/runtime/runtime-reset
    //   → job-detail/index
    members: [
      "src/features/job-detail/domain/status-detail-runtime-port.ts",
      "src/features/job-detail/index.ts",
      "src/features/jobs/domain/runtime/controller.ts",
      "src/features/jobs/domain/runtime/runtime-reset.ts",
      "src/features/jobs/index.ts",
    ],
  },
  {
    name: "ingest 内部",
    // domain → domain/translation-workflow-dialog-runtime → domain
    members: [
      "src/features/ingest/domain.ts",
      "src/features/ingest/domain/translation-workflow-dialog-runtime.ts",
    ],
  },
  {
    name: "platform/mock 内部",
    // live-jobs-events → live-jobs → live-jobs-events
    members: [
      "src/platform/mock/live-jobs-events.ts",
      "src/platform/mock/live-jobs.ts",
    ],
  },
];

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function memberKey(members) {
  return [...members].sort().join("\n");
}

function isSuperset(candidateMembers, requiredMembers) {
  const set = new Set(candidateMembers);
  return requiredMembers.every((member) => set.has(member));
}

/** 当前循环里不在 allowlist 的全部条目（新环）。 */
function findUnexpectedCycles(cycles, allowed) {
  const allowedKeys = new Set(allowed.map((entry) => memberKey(entry.members)));
  return cycles.filter((cycle) => !allowedKeys.has(memberKey(cycle.members)));
}

/** allowlist 里已经不成环、必须删除的条目（强制收紧）。 */
function findStaleAllowed(allowed, cycles) {
  return allowed.filter(
    (entry) => !cycles.some((cycle) => isSuperset(cycle.members, entry.members)),
  );
}

/** 历史已修复循环里重新出现的条目。 */
function findRegressedEliminated(eliminated, cycles) {
  return eliminated.filter(
    (entry) => cycles.some((cycle) => isSuperset(cycle.members, entry.members)),
  );
}

function describe(cycles) {
  return cycles
    .map((cycle) => `  - ${cycle.members.length} 文件 / ${cycle.edges.length} 边:\n${cycle.members.map((m) => `      ${m}`).join("\n")}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// 门禁
// ---------------------------------------------------------------------------

test("src 无未登记的值依赖循环（新环即失败）", () => {
  const cycles = analyzeImportCycles();
  const unexpected = findUnexpectedCycles(cycles, ALLOWED_CYCLES);
  assert.deepEqual(
    unexpected,
    [],
    `发现 ${unexpected.length} 个未登记的 import 值循环：\n${describe(unexpected)}\n\n`
      + "请拆除回边；如确属有意为之，再登记进 ALLOWED_CYCLES 并说明原因。",
  );
});

test("ALLOWED_CYCLES 里的环一旦被修掉就必须删除条目（强制收紧）", () => {
  const cycles = analyzeImportCycles();
  const stale = findStaleAllowed(ALLOWED_CYCLES, cycles);
  assert.deepEqual(
    stale.map((entry) => entry.name ?? memberKey(entry.members)),
    [],
    "以下 baseline 条目在当前图中已不成环，请从 ALLOWED_CYCLES 删除：\n"
      + stale.map((entry) => `  - ${entry.name ?? ""}\n${entry.members.map((m) => `      ${m}`).join("\n")}`).join("\n"),
  );
});

test("已知已修复的循环不得回归", () => {
  const cycles = analyzeImportCycles();
  const regressed = findRegressedEliminated(KNOWN_ELIMINATED_CYCLES, cycles);
  assert.deepEqual(
    regressed.map((entry) => entry.name),
    [],
    "以下历史上已拆断的循环重新出现，请拆除回边：\n"
      + regressed.map((entry) => `  - ${entry.name}\n${entry.members.map((m) => `      ${m}`).join("\n")}`).join("\n"),
  );
});

test("扫描根有效且能覆盖全量源码", () => {
  const { files, byFile } = buildGraph();
  assert.ok(files.length > 400, `只扫到 ${files.length} 个源文件，扫描根疑似失效`);
  assert.equal(byFile.size, files.length, "依赖图节点数与源文件数不一致");
});

// ---------------------------------------------------------------------------
// 自检：锁定解析口径与 SCC 实现，避免门禁本身悄悄失效
// ---------------------------------------------------------------------------

test("解析口径：只统计值依赖，忽略 type-only", () => {
  assert.deepEqual(
    extractValueSpecifiers('import { createStore, type Store } from "@/platform/store/store.js";'),
    ["@/platform/store/store.js"],
    "`{ type Store }` 是类型绑定，不能把整条 import 丢掉",
  );
  assert.deepEqual(
    extractValueSpecifiers('import { type A, type B } from "@/a.js";'),
    [],
    "命名绑定全是 type 前缀时应视为 type-only",
  );
  assert.deepEqual(extractValueSpecifiers('import type { A } from "@/a.js";'), []);
  assert.deepEqual(extractValueSpecifiers('export type { A } from "@/a.js";'), []);
  assert.deepEqual(extractValueSpecifiers('export { type A } from "@/a.js";'), []);
  assert.deepEqual(extractValueSpecifiers('export * from "@/a.js";'), ["@/a.js"]);
  assert.deepEqual(extractValueSpecifiers('import "./polyfill.js";'), ["./polyfill.js"]);
  assert.deepEqual(
    extractValueSpecifiers('const p = import("./lazy.js");'),
    ["./lazy.js"],
    "运行时动态 import 必须计入",
  );
  assert.deepEqual(
    extractValueSpecifiers('type T = typeof import("../domain/controller.js").create;'),
    [],
    "typeof import(...) 是类型位置，不能计入",
  );
  assert.deepEqual(
    extractValueSpecifiers('type T = import("@/x.js").A;'),
    [],
    "import(...) 类型节点不能计入",
  );
});

test("Tarjan SCC 能识别环、且不误报 DAG", () => {
  const graph = { a: ["b"], b: ["c"], c: ["a"], d: ["a"], e: [] };
  const sccs = findSccs(["a", "b", "c", "d", "e"], (node) => graph[node] ?? []);
  const cyclic = sccs.filter((component) => component.length > 1);
  assert.equal(cyclic.length, 1, "应当且只应当识别出一个环");
  assert.deepEqual([...cyclic[0]].sort(), ["a", "b", "c"]);
});

test("baseline 比较逻辑：新环失败、修掉的环强制删除", () => {
  const cycle = (members) => ({ members, edges: [] });
  const allowed = [{ name: "已知", members: ["a.ts", "b.ts"] }];

  // 现状与 baseline 完全一致 → 既无新环，也无过期条目
  assert.deepEqual(findUnexpectedCycles([cycle(["b.ts", "a.ts"])], allowed), []);
  assert.deepEqual(findStaleAllowed(allowed, [cycle(["b.ts", "a.ts"])]), []);

  // 出现 baseline 之外的第三个环 → 新环必须被报出
  const newCycle = cycle(["c.ts", "d.ts"]);
  assert.deepEqual(findUnexpectedCycles([cycle(["a.ts", "b.ts"]), newCycle], allowed), [newCycle]);

  // baseline 环被拆掉（成员散成各自单点）→ 必须报为过期
  assert.deepEqual(findStaleAllowed(allowed, [cycle(["a.ts"]), cycle(["b.ts"])]), allowed);

  // 已修复历史环回归 → 必须被报出
  const eliminated = [{ name: "历史", members: ["x.ts", "y.ts"] }];
  assert.deepEqual(findRegressedEliminated(eliminated, [cycle(["x.ts", "y.ts", "z.ts"])]), eliminated);
  assert.deepEqual(findRegressedEliminated(eliminated, [cycle(["x.ts"]), cycle(["y.ts"])]), []);
});

test("formatCycleSummary 可人工运行打印", () => {
  const cycles = analyzeImportCycles();
  const summary = formatCycleSummary(cycles);
  assert.match(summary, /import 环检测/);
  if (cycles.length === 0) assert.match(summary, /发现 0 个循环/);
  const first = cycles[0];
  if (first) assert.ok(summary.includes(first.members[0]));
});
