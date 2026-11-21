import test from "node:test";
import assert from "node:assert/strict";

import { compareRules, ruleList } from "../../scripts/css-equivalence.mjs";

test("纯搬家（顺序也一样）判为完全相同", () => {
  const css = ".a{color:red}.b{color:blue}@media (max-width:5px){.a{color:green}}";
  assert.equal(compareRules(ruleList(css), ruleList(css)).identical, true);
});

test("声明改动、增删规则都报出来", () => {
  const diff = compareRules(ruleList(".a{color:red}.b{margin:0}"), ruleList(".a{color:blue}.c{margin:0}"));
  assert.deepEqual(diff.changed, [" || .a"]);
  assert.deepEqual(diff.removed, [" || .b"]);
  assert.deepEqual(diff.added, [" || .c"]);
});

test("先后被调换且设置同一属性的规则对必须报出 —— 集合相同也可能改界面", () => {
  // .x 和 .y 若命中同一元素：原来 .y 在后、color 取 blue；调换后取 red。
  const diff = compareRules(ruleList(".x{color:red}.y{color:blue}"), ruleList(".y{color:blue}.x{color:red}"));
  assert.equal(diff.identical, false);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.changed, []);
  assert.deepEqual(diff.reordered, [{ first: " || .x", second: " || .y", props: ["color"] }]);
});

test("调换的两条规则不设同一属性，不算风险", () => {
  const diff = compareRules(ruleList(".x{color:red}.y{margin:0}"), ruleList(".y{margin:0}.x{color:red}"));
  assert.deepEqual(diff.reordered, []);
});

test("不同 @media 里的同名属性不算调换风险", () => {
  const before = ruleList(".x{color:red}@media (max-width:5px){.y{color:blue}}");
  const after = ruleList("@media (max-width:5px){.y{color:blue}}.x{color:red}");
  assert.deepEqual(compareRules(before, after).reordered, []);
});
