import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// 死选择器防复活门禁。
//
// 这些类没有任何 JS/TSX 写入者（React 已改用 reader-workspace-* 与
// is-assistant-open / is-workspace-{reading,compare,markdown,ai}），删除后
// 用本测试锁住：类名若被重新引入（无论 CSS 还是别处），必须先有真实写入者
// 并更新这里。

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const READER_STYLES = join(REPO_ROOT, "frontend/packages/reader/styles");
const WEB_STYLES = join(REPO_ROOT, "frontend/web/src/styles");

function read(relPath) {
  // 去掉注释再断言：文件头注释会点名被删选择器，避免误判为复活。
  return readFileSync(join(READER_STYLES, relPath), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

const CASES = [
  {
    file: "react-pdf.css",
    forbidden: [
      /\.is-markdown-split\b/,
      /\.is-ai-split\b/,
      /\.is-workspace-split\b/,
      /\.is-pdf-pane-[a-z]/,
      /\.is-pdf-pair\b/,
      /\.is-reversed\b/,
    ],
    required: [/\.reader-ai-split-resizer\b/, /\.reader-ai-split-separator\b/],
  },
  {
    file: "chrome.css",
    forbidden: [/\.reader-topbar\b/, /\.reader-tabs\b/, /\.reader-tab\b/],
    required: [
      /\.reader-workspace-bar\b/,
      /\.reader-workspace-tabs\b/,
      /\.reader-workspace-tab\b/,
    ],
  },
  {
    file: "content.css",
    forbidden: [/\.reader-topbar-actions\b/, /\.reader-tab\b/],
    required: [/\.reader-source-only\b/, /\.reader-workspace-tab\b/],
  },
  {
    file: "hud.css",
    forbidden: [/\.reader-context-modes\b/, /\.reader-react-topbar\b/, /\.reader-tab\b/],
    required: [/\.reader-react-hud\b/],
  },
];

for (const { file, forbidden, required } of CASES) {
  test(`reader/styles/${file} 不再含死选择器`, () => {
    const css = read(file);
    for (const pattern of forbidden) {
      assert.doesNotMatch(css, pattern, `死选择器复活: ${pattern} (${file})`);
    }
    for (const pattern of required) {
      assert.match(css, pattern, `现役选择器缺失: ${pattern} (${file})`);
    }
  });
}

test("web 侧重复的 reader.utilities.css 镜像已删除", () => {
  assert.equal(
    existsSync(join(WEB_STYLES, "reader.utilities.css")),
    false,
    "frontend/web/src/styles/reader.utilities.css 是包内同名文件的逐字节镜像且无人 import，应删除",
  );
});
