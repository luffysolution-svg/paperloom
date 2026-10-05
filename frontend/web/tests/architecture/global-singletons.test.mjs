// 模块级全局 / 单例门禁（allowlist，只减不增）。
//
// 背景：模块顶层的可变状态（顶层 let/var、缓存 Map/Set、window/globalThis
// 赋值、Symbol.for 全局 store）会绕过依赖注入、制造跨测试泄漏与隐式单例。
// 本门禁扫描 src/**/*.{ts,tsx}（排除 mock/generated），以 allowlist 登记现存项：
//   - 出现未登记的顶层可变状态 → 失败；
//   - allowlist 条目已不存在 → 失败，强制删除收紧（迁移/去重后不许留白名单）。
// 解析用逐行花括号状态机，函数体 / 对象与类型字面量里的同名写法不会被误判。
//
// 更新：`UPDATE_GLOBAL_SINGLETONS_ALLOWLIST=1 node --test …` 重新生成 allowlist。
// allowlist: tests/architecture/helpers/global-singletons-allowlist.json

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROJECT_ROOT,
  findTopLevelMutableState,
  mutableStateKey,
  readSource,
  stripCommentsAndStrings,
  walkSourceFiles,
} from "./helpers/source-scan.mjs";

const ALLOWLIST_PATH = join(
  PROJECT_ROOT,
  "tests/architecture/helpers/global-singletons-allowlist.json",
);
const UPDATE_ENV = "UPDATE_GLOBAL_SINGLETONS_ALLOWLIST";

/** 当前全部顶层可变状态：key → { file, line, kind, name }。 */
function currentMutableState() {
  const entries = new Map();
  for (const file of walkSourceFiles().sort()) {
    for (const hit of findTopLevelMutableState(readSource(file))) {
      entries.set(mutableStateKey(file, hit), { file, ...hit });
    }
  }
  return entries;
}

function readAllowlist() {
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

test("没有未登记的模块级可变状态（新单例即失败）", () => {
  const current = currentMutableState();

  if (process.env[UPDATE_ENV] === "1") {
    writeFileSync(ALLOWLIST_PATH, `${JSON.stringify([...current.keys()].sort(), null, 2)}\n`);
    return;
  }

  const allowed = new Set(readAllowlist());
  const unexpected = [...current.entries()]
    .filter(([key]) => !allowed.has(key))
    .map(([, entry]) => `  - ${entry.file}:${entry.line} [${entry.kind}] ${entry.name}`);

  assert.deepEqual(
    unexpected,
    [],
    `发现未登记的模块级可变状态，请改为注入/局部状态，或登记进 allowlist 并说明：\n`
      + `${unexpected.join("\n")}\n更新运行 ${UPDATE_ENV}=1 npm test。`,
  );
});

test("allowlist 没有陈旧条目（去重/迁移后必须删除）", () => {
  if (process.env[UPDATE_ENV] === "1") return;
  const current = currentMutableState();
  const stale = readAllowlist().filter((key) => !current.has(key));
  assert.deepEqual(
    stale,
    [],
    `allowlist 中以下条目已不存在，请运行 ${UPDATE_ENV}=1 npm test 删除：\n  ${stale.join("\n  ")}`,
  );
});

test("扫描根有效且覆盖全量源码", () => {
  const files = walkSourceFiles();
  assert.ok(files.length > 400, `只扫到 ${files.length} 个源文件，扫描根疑似失效`);
  assert.ok(
    !files.some((file) => file.includes("/mock") || file.includes("generated")),
    "mock/generated 文件必须被排除",
  );
});

// ---------------------------------------------------------------------------
// 解析口径自检：锁定状态机行为，避免门禁本身悄悄失效或误报
// ---------------------------------------------------------------------------

test("只识别模块顶层，不误判函数内局部 let / new Map", () => {
  const source = [
    "export function make() {",
    "  let local = 1;",
    "  const cache = new Map();",
    "  return { local, cache };",
    "}",
  ].join("\n");
  assert.deepEqual(findTopLevelMutableState(source), []);
});

test("类型字面量里的字段不会被当成顶层状态", () => {
  const source = [
    "type State = {",
    "  let: string;",
    "  window: string;",
    "};",
  ].join("\n");
  assert.deepEqual(findTopLevelMutableState(source), []);
});

test("识别顶层 let / var、new Map/Set、window 赋值、Symbol.for", () => {
  const source = [
    "let a = 0;",
    "export let b = 1;",
    "var c = 2;",
    "const STATUSES = new Set(['x']);",
    "const cache: Map<string, number> = new Map();",
    "window.__app = {};",
    "globalThis.__booted = true;",
    "const KEY = Symbol.for('retainpdf.store');",
    "function inner() { let hidden = 1; }",
  ].join("\n");
  assert.deepEqual(
    findTopLevelMutableState(source).map((hit) => [hit.kind, hit.name]),
    [
      ["let-var", "a"],
      ["let-var", "b"],
      ["let-var", "c"],
      ["new-collection", "STATUSES"],
      ["new-collection", "cache"],
      ["global-assign", "window.__app"],
      ["global-assign", "globalThis.__booted"],
      ["symbol-for-store", "KEY"],
    ],
  );
});

test("注释与字符串里的可疑文本不触发匹配", () => {
  const source = [
    "// let commented = 1;",
    "/* const cache = new Map(); */",
    "const label = 'window.x = 1';",
    "const tpl = `let tpl = 2;`;",
  ].join("\n");
  assert.deepEqual(findTopLevelMutableState(source), []);
});

test("stripCommentsAndStrings 保留换行以维持行号", () => {
  const stripped = stripCommentsAndStrings("const a = 1; // tail\n/* x\ny */\nconst b = 2;");
  assert.equal(stripped.split("\n").length, 4);
});
