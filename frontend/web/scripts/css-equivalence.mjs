#!/usr/bin/env node
// 样式重构的等价核对：拆分 / 搬家前后，编译出的样式表是否等价。
//
//   node scripts/css-equivalence.mjs snapshot <基准.json>   # 改之前：构建并记下基准
//   node scripts/css-equivalence.mjs compare  <基准.json>   # 改之后：构建并与基准对比
//
// 比的是 dist/css/{home,detail,reader}.css 的编译结果（不是源文件），按「上下文（@layer / @media
// / @supports 链）+ 选择器」逐条比声明：
//
// 1. 连顺序都完全一样 → 纯搬家，界面不可能变。
// 2. 否则列出增加 / 删除 / 改动的规则。
// 3. 只比集合不够：两条同优先级规则设了同一个属性，谁在后谁生效。所以再找「先后被调换、
//    且设置了同一个属性」的规则对 —— 它们若命中同一个元素，界面就会变。逐条列出供人判断。
//
// 退出码：完全等价 0；有差异 1（是否可接受由人判断，脚本只负责不漏）。

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLES = ["home", "detail", "reader"];

function build() {
  execFileSync("npm", ["run", "-s", "build:css"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
}

/** 编译后的样式表 → 有序规则列表：[{ key, decls: {prop: value} }]。 */
export function ruleList(css) {
  const rules = [];
  postcss.parse(css).walkRules((rule) => {
    const context = [];
    for (let node = rule.parent; node && node.type !== "root"; node = node.parent) {
      if (node.type === "atrule") context.unshift(`@${node.name} ${node.params}`.trim());
    }
    const decls = {};
    for (const child of rule.nodes || []) {
      if (child.type === "decl") decls[child.prop] = `${child.value}${child.important ? " !important" : ""}`.replace(/\s+/g, " ");
    }
    const selector = rule.selectors.map((s) => s.replace(/\s+/g, " ").trim()).join(", ");
    rules.push({ key: `${context.join(" > ")} || ${selector}`, decls });
  });
  return rules;
}

function snapshot() {
  build();
  return Object.fromEntries(BUNDLES.map((name) => [name, ruleList(readFileSync(join(ROOT, "dist/css", `${name}.css`), "utf8"))]));
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 两份有序规则列表的差异。纯函数，测试直接调。 */
export function compareRules(before, after) {
  if (same(before, after)) return { identical: true, added: [], removed: [], changed: [], reordered: [] };
  const index = (list) => {
    const map = new Map();
    list.forEach((rule, position) => map.set(rule.key, [...(map.get(rule.key) || []), { ...rule, position }]));
    return map;
  };
  const b = index(before);
  const a = index(after);
  const added = [...a.keys()].filter((key) => !b.has(key));
  const removed = [...b.keys()].filter((key) => !a.has(key));
  const changed = [];
  for (const [key, rules] of b) {
    if (!a.has(key)) continue;
    const merged = (list) => Object.assign({}, ...list.map((rule) => rule.decls));
    if (!same(merged(rules), merged(a.get(key)))) changed.push(key);
  }
  // 先后被调换且设置了同一个属性的规则对（只看前后都恰好出现一次的规则，位置才有意义）。
  const single = [...b.keys()].filter((key) => b.get(key).length === 1 && a.get(key)?.length === 1);
  const reordered = [];
  for (let i = 0; i < single.length; i += 1) {
    for (let j = i + 1; j < single.length; j += 1) {
      const [x, y] = [single[i], single[j]];
      const beforeOrder = b.get(x)[0].position < b.get(y)[0].position;
      const afterOrder = a.get(x)[0].position < a.get(y)[0].position;
      if (beforeOrder === afterOrder) continue;
      const contextOf = (key) => key.split(" || ")[0];
      if (contextOf(x) !== contextOf(y)) continue;
      const shared = Object.keys(b.get(x)[0].decls).filter((prop) => prop in b.get(y)[0].decls);
      if (shared.length) reordered.push({ first: x, second: y, props: shared });
    }
  }
  return { identical: false, added, removed, changed, reordered };
}

function report(name, diff) {
  if (diff.identical) {
    console.log(`✓ ${name}.css 与基准完全相同（规则、声明、顺序都一样）`);
    return true;
  }
  console.log(`✗ ${name}.css 与基准不同：`);
  for (const [label, list] of [["增加", diff.added], ["删除", diff.removed], ["声明改动", diff.changed]]) {
    if (list.length) console.log(`  ${label} ${list.length} 条：\n    ${list.join("\n    ")}`);
  }
  if (diff.reordered.length) {
    console.log(`  先后调换且设置同一属性 ${diff.reordered.length} 对（若命中同一元素，界面会变）：`);
    for (const pair of diff.reordered.slice(0, 20)) console.log(`    ${pair.first}\n      ↕ ${pair.second}  [${pair.props.join(", ")}]`);
    if (diff.reordered.length > 20) console.log(`    …… 另有 ${diff.reordered.length - 20} 对。整块挪动规则的位置会产生大量这类配对：尽量保持原来的先后顺序拆分。`);
  }
  if (!diff.added.length && !diff.removed.length && !diff.changed.length && !diff.reordered.length) {
    console.log("  只有不涉及同一属性的顺序变化，不影响界面");
    return true;
  }
  return false;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [command, file] = process.argv.slice(2);
  if (!["snapshot", "compare"].includes(command) || !file) {
    console.error("用法：css-equivalence.mjs snapshot|compare <基准.json>");
    process.exit(2);
  }
  if (command === "snapshot") {
    writeFileSync(file, JSON.stringify(snapshot()));
    console.log(`基准已写入 ${file}`);
  } else {
    const baseline = JSON.parse(readFileSync(file, "utf8"));
    const current = snapshot();
    const ok = BUNDLES.map((name) => report(name, compareRules(baseline[name], current[name]))).every(Boolean);
    process.exit(ok ? 0 : 1);
  }
}
