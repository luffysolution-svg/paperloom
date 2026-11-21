// 样式模块化门禁：样式按组件拆成小文件，并且不再长回巨型样式表。
//
// 1. 单个样式文件不超过 MAX_LINES 行。现存超标的登记在 helpers/css-oversize-allowlist.json，
//    只减不增：超过登记行数失败；降到上限以内必须从清单里删掉（不许留白名单）。
// 2. 放在组件旁边的样式（src/features/**、src/ui/**、src/app/** 下的 .css）开头必须声明
//        @owns 前缀, 前缀…   这个文件负责的类名前缀
//        @uses 类名, 类名…   （可选）确实要引用的别的组件的类
//    文件里每个选择器用到的类名，只能是自己的前缀、is-/has-/data 状态类，或 @uses 登记的。
//    —— 组件只能改自己的东西；要碰别人的类，得写在文件头上让人看见。

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const MAX_LINES = 400;
const ALLOWLIST_PATH = join(ROOT, "tests/architecture/helpers/css-oversize-allowlist.json");

function cssFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...cssFiles(path));
    else if (entry.endsWith(".css")) out.push(path);
  }
  return out;
}

const allCss = cssFiles(join(ROOT, "src")).map((path) => relative(ROOT, path)).sort();
// 末尾有没有换行符都按编辑器里看到的行数算。
const lineCount = (file) => {
  const text = readFileSync(join(ROOT, file), "utf8");
  return text ? text.split("\n").length - (text.endsWith("\n") ? 1 : 0) : 0;
};

test(`单个样式文件不超过 ${MAX_LINES} 行（现存超标的只减不增）`, () => {
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  const problems = [];
  for (const file of allCss) {
    const lines = lineCount(file);
    const allowed = allowlist[file];
    if (allowed === undefined && lines > MAX_LINES) {
      problems.push(`${file}: ${lines} 行，超过 ${MAX_LINES} —— 按组件拆开，不要加进白名单`);
    } else if (allowed !== undefined && lines > allowed) {
      problems.push(`${file}: ${lines} 行，超过登记的 ${allowed} 行 —— 白名单只减不增`);
    }
  }
  for (const [file, allowed] of Object.entries(allowlist)) {
    if (!allCss.includes(file)) problems.push(`${file}: 已不存在，从 css-oversize-allowlist.json 删掉`);
    else if (lineCount(file) <= MAX_LINES) problems.push(`${file}: 已降到 ${lineCount(file)} 行（≤ ${MAX_LINES}），从白名单删掉`);
    else if (lineCount(file) < allowed) problems.push(`${file}: 已降到 ${lineCount(file)} 行，把白名单里的 ${allowed} 改小，免得再涨回去`);
  }
  assert.deepEqual(problems, []);
});

/** 选择器里出现的类名（去掉注释、字符串、url() 里的点号）。 */
export function classesIn(css) {
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/url\([^)]*\)/g, "")
    .replace(/"[^"]*"|'[^']*'/g, "");
  const classes = new Set();
  // 只看规则头（{ 之前），声明值里的小数（0.5）不算。
  for (const match of cleaned.matchAll(/([^{}]+)\{/g)) {
    const head = match[1].trim();
    // Tailwind v4 的 `@utility 名字 { … }` 定义的就是类 `.名字`。
    const utility = head.match(/^@utility\s+([A-Za-z_][\w-]*)/);
    if (utility) {
      classes.add(utility[1]);
      continue;
    }
    if (head.startsWith("@")) continue;
    for (const cls of head.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classes.add(cls[1]);
  }
  return classes;
}

function header(css, tag) {
  const match = css.match(new RegExp(`@${tag}\\s+([^\\n*]+)`));
  return match ? match[1].split(",").map((part) => part.trim()).filter(Boolean) : null;
}

const STATE_CLASS = /^(is|has)-/;

test("组件旁的样式只碰自己的类（@owns），引用别人的必须登记 @uses", () => {
  const colocated = allCss.filter((file) => ["src/features/", "src/ui/", "src/app/"].some((root) => file.startsWith(root)));
  const problems = [];
  for (const file of colocated) {
    const css = readFileSync(join(ROOT, file), "utf8");
    const owns = header(css, "owns");
    if (!owns) {
      problems.push(`${file}: 缺少文件头 @owns 声明`);
      continue;
    }
    const uses = new Set(header(css, "uses") || []);
    for (const cls of classesIn(css)) {
      const ok = owns.some((prefix) => cls === prefix || cls.startsWith(`${prefix}-`)) || STATE_CLASS.test(cls) || uses.has(cls);
      if (!ok) problems.push(`${file}: .${cls} 不在 @owns ${owns.join(",")} 里，也没登记 @uses`);
    }
  }
  assert.deepEqual(problems, []);
});

test("classesIn 只取选择器里的类名，@utility 的名字也算类", () => {
  const css = `/* .comment-class */ .a-b .c:hover, .d[data-x="1.5"] > .e { width: 0.5rem; background: url(x.png); }
@media (max-width: 4px) { .f { margin: 0 } }
@utility g-h { .i & { color: red } }`;
  assert.deepEqual([...classesIn(css)].sort(), ["a-b", "c", "d", "e", "f", "g-h", "i"]);
});
