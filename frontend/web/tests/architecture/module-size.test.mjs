// 文件体量 / god-file 棘轮门禁。
//
// 背景：architecture 下已有分层、依赖环、CSS/DOM 等门禁，但没有一条约束单个
// 源文件的体量。god 文件（几百行、多职责）会持续膨胀且不易在 code review 里
// 被察觉。本门禁设一条告警线（普通文件 380 行），用棘轮钉住当前超标文件：
//   - 不在 baseline 且超过阈值 → 新增 god 文件，失败；
//   - 在 baseline 但行数上涨 → 继续膨胀，失败；
//   - 在 baseline 但行数下降 / 已低于阈值 → baseline 陈旧，失败，强制拧紧。
// mock 数据与 generated 文件（platform/api/mocks、platform/mock、
// platform/generated）属于数据而非逻辑，整体排除。
//
// 收敛后运行 `UPDATE_MODULE_SIZE_BASELINE=1 node --test …` 重新生成 baseline
// （只减不增：下降的文件会被固化，低于阈值的条目会被移除）。
// baseline: tests/architecture/helpers/module-size-baseline.json

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { countLines, PROJECT_ROOT, readSource, walkSourceFiles } from "./helpers/source-scan.mjs";

const THRESHOLD = 380;
const BASELINE_PATH = join(
  PROJECT_ROOT,
  "tests/architecture/helpers/module-size-baseline.json",
);
const UPDATE_ENV = "UPDATE_MODULE_SIZE_BASELINE";

/** 当前超过阈值的文件 → 行数。 */
function currentOverThreshold() {
  const over = {};
  for (const file of walkSourceFiles().sort()) {
    const loc = countLines(readSource(file));
    if (loc > THRESHOLD) over[file] = loc;
  }
  return over;
}

function readBaseline() {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

test("超过阈值的文件只减不增（god-file 棘轮）", () => {
  const current = currentOverThreshold();

  if (process.env[UPDATE_ENV] === "1") {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    return;
  }

  const baseline = readBaseline();
  const failures = [];
  for (const [file, loc] of Object.entries(current)) {
    const allowed = baseline[file];
    if (allowed === undefined) {
      failures.push(`${file}: ${loc} 行（新增超过 ${THRESHOLD} 行阈值，未登记）`);
    } else if (loc > allowed) {
      failures.push(`${file}: ${loc} 行（棘轮上限 ${allowed}，又长了 ${loc - allowed} 行）`);
    }
  }

  assert.deepEqual(
    failures,
    [],
    `以下文件超过体量棘轮，请拆分模块（目标 ≤ ${THRESHOLD} 行）：\n  ${failures.join("\n  ")}\n`
      + `若确认现状，运行 ${UPDATE_ENV}=1 npm test 重新生成 baseline。`,
  );
});

test("baseline 没有虚高（拆小/收敛后必须拧紧）", () => {
  if (process.env[UPDATE_ENV] === "1") return;
  const current = currentOverThreshold();
  const baseline = readBaseline();
  const stale = [];
  for (const [file, allowed] of Object.entries(baseline)) {
    const loc = current[file] ?? 0;
    if (loc < allowed) {
      const reason = loc <= THRESHOLD ? `已低于阈值 ${THRESHOLD}` : "已拆小";
      stale.push(`${file}: 实际 ${loc} < baseline ${allowed}（${reason}）`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    `收敛成果未固化，运行 ${UPDATE_ENV}=1 npm test 拧紧棘轮：\n  ${stale.join("\n  ")}`,
  );
});

test("扫描根有效且覆盖全量源码", () => {
  const files = walkSourceFiles();
  assert.ok(files.length > 400, `只扫到 ${files.length} 个源文件，扫描根疑似失效`);
  assert.ok(
    files.every((file) => file.startsWith("src/")),
    "扫描结果应全部位于 src/ 下",
  );
  assert.ok(
    !files.some((file) => file.includes("/mock") || file.includes("generated")),
    "mock/generated 文件必须被排除",
  );
});
