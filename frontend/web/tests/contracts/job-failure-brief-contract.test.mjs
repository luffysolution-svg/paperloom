/** 列表失败简报的字段名，两端必须一致。
 *
 * 真值是契约 `contracts/job-status.v1.schema.json#/definitions/JobFailureBriefView`
 * （后端测试 failed_job_list_item_failure_matches_published_schema 拿真实接口输出对照它）；
 * 前端 `JobFailureBrief` 按这些键硬读。
 *
 * 只改一边时 tsc 不报 —— 那些字段在 TS 侧是可选的，取值处还有 `as` 强转
 * （`(ocrJob as { failure?: JobFailureBrief })?.failure`）。两边单测也照样全绿：
 * Rust 那条断言的是作者手写的夹具，前端那条喂的是作者手写的对象。而用户看到的是
 * 「根因」那一行、「上游 · mineru」那半行**整行消失**；`retryable` 一漂，不可重试的
 * 失败会开始怂恿人去点重试。
 */
import test from "node:test";
import assert from "node:assert/strict";

import { code, readSource } from "../helpers/source-text.mjs";

const read = (rel) => readSource(rel, import.meta.url);

/** 取一个结构体 / 类型字面量的定义体。
 *
 * 找不到起点时**必须红**，不能静默返回空串 —— 空集合上的 deepEqual 是恒等式。 */
function definitionBody(source, startMarker, endMarker) {
  const from = source.indexOf(startMarker);
  assert.notEqual(from, -1, `找不到 ${startMarker} —— 它被改名或搬走了，这条契约没在守任何东西`);
  const rest = source.slice(from + startMarker.length);
  const to = rest.indexOf(endMarker);
  assert.notEqual(to, -1, `${startMarker} 的定义没有收尾`);
  return rest.slice(0, to);
}

const TS_SOURCE = read("../../src/platform/contracts/library-payloads.ts");

// 字段名 → 是否可选（`?:`）。
const tsDeclared = () => new Map(
  [
    ...definitionBody(TS_SOURCE, "export type JobFailureBrief = {", "\n};")
      .matchAll(/^\s{2}([a-z_]+)(\??):/gm),
  ].map((m) => [m[1], m[2] === "?"]),
);
const tsFields = () => [...tsDeclared().keys()];

const SCHEMA = JSON.parse(read("../../../../contracts/job-status.v1.schema.json"));

const schemaBrief = () => {
  const brief = SCHEMA.definitions?.JobFailureBriefView;
  assert.ok(brief, "契约里找不到 JobFailureBriefView —— 它被改名或搬走了，这条契约没在守任何东西");
  const fields = Object.keys(brief.properties || {});
  // 抽取失效时要红，不能在空集合上恒真。
  assert.ok(fields.length >= 7, `契约里只有 ${fields.length} 个字段，解析逻辑失效了`);
  return { brief, fields };
};

test("列表失败简报的字段名两端一致 —— 漂一个，卡片上就空一行", () => {
  assert.deepEqual(
    [...tsFields()].sort(),
    [...schemaBrief().fields].sort(),
    "两端字段名不一致 —— 多出来的那个永远是 undefined，少掉的那个永远画不出来",
  );
});

test("哪些字段必有、哪些可能缺，两端一致 —— retryable 必须是布尔", () => {
  const { brief } = schemaBrief();
  const required = new Set(brief.required || []);
  for (const [field, optional] of tsDeclared()) {
    assert.equal(
      optional,
      !required.has(field),
      `${field}：契约里${required.has(field) ? "必有" : "可能缺（空的时候整个键不出现）"}，TS 却写成${optional ? "可选" : "必有"}`,
    );
  }
  assert.equal(brief.properties.retryable?.type, "boolean");
});

test("列表项的 failure 指向这份定义", () => {
  assert.equal(
    SCHEMA.definitions?.JobListItemView?.properties?.failure?.$ref,
    "#/definitions/JobFailureBriefView",
  );
});

test("前端真的只读这些键 —— 没有谁凭记忆拼了一个后端不发的字段", () => {
  const declared = new Set(tsFields());
  const consumers = [
    "../../src/features/book-detail/domain/job-failure-model.ts",
    "../../src/features/book-detail/ui/panels/processing/JobFailureCard.tsx",
  ];
  let checked = 0;
  for (const rel of consumers) {
    // 剥注释：说明文字里会提到字段名（「root_cause 常常是上游原样抛回来的」），
    // 不剥的话这条会去校验注释里的词。
    for (const [, key] of code(read(rel)).matchAll(/failure(?:\?)?\.([a-z_]+)/g)) {
      checked += 1;
      assert.ok(declared.has(key), `${rel} 读了一个契约里没有的字段：failure.${key}`);
    }
  }
  assert.ok(checked > 0, "一个字段读取都没扫到 —— 正则失效了，这条是空转");
});
