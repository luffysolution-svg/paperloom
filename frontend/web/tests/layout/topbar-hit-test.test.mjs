/** 顶栏的每个控件，在每个视口宽度下都点得到。
 *
 * # 为什么需要一道「真布局」门禁
 *
 * 仓库里已有的 `hidingRulesFor()` 守的是「一条 CSS 把它整个吃掉」
 * （display:none / opacity:0 / pointer-events:none）。它按设计**不看两件事**：
 *
 * - **层叠顺序和特异性** —— 隐藏规则自己被顶掉它天生反着看不见
 * - **几何** —— z-index 遮挡、overflow 裁剪、被绝对定位甩出容器
 *
 * 今天六份审查里最有价值的几条恰恰都落在这两处，而且只有真的起了浏览器的那一份
 * 找得到。所以这里用 playwright 对每个控件做 elementFromPoint 自命中断言。
 *
 * # 这一条抓到的
 *
 * `.reader-chrome-tray` 是 position:fixed 且 z-index 比顶栏高，会压在顶栏上；
 * 顶栏里的东西靠 justify-content:center 居中，窄屏下滑到它底下：465px 起
 * 「点此关闭面板恢复对照」被下载组接走点击，420px 起「翻译文件」页签也点不到
 * （iPhone SE 的 375px 在最坏那一档）。
 *
 * 用的是**构建产物** dist/css/reader.css —— 源 CSS 分片单独看都没问题，问题出在
 * 它们合到一起之后。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertReaderCssIsFresh } from "../helpers/built-css.mjs";

import { ReaderWorkspaceTabs }
  from "../../../packages/reader/src/components/react-pdf/ReaderWorkspaceTabs.tsx";
import { ReaderDownloadActions }
  from "../../../packages/reader/src/components/react-pdf/ReaderDownloadActions.tsx";

const CSS_PATH = fileURLToPath(new URL("../../dist/css/reader.css", import.meta.url));
const require_ = createRequire(fileURLToPath(new URL("../../package.json", import.meta.url)));

/** 窄到 375（iPhone SE）—— 最坏那一档就在这附近。 */
const WIDTHS = [1440, 900, 700, 580, 520, 465, 420, 375];

function buildPage() {
  const bar = renderToStaticMarkup(createElement(ReaderWorkspaceTabs, {
    mode: "compare", documentReady: true, onModeChange() {},
  }));
  const tray = renderToStaticMarkup(createElement(ReaderDownloadActions, {
    download: { jobId: "j", urls: { source: "/a.pdf", sideBySide: "/b.pdf", translated: "/c.pdf" } },
  }));
  const css = readFileSync(CSS_PATH, "utf8");
  return `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div class="reader-react-root">${bar}
<div class="reader-chrome-tray">${tray}<button class="reader-close-home-btn">关闭</button></div>
</div>`;
}

test("顶栏每个控件在 375–1440px 都点得到", { concurrency: 1 }, async (t) => {
  assertReaderCssIsFresh(CSS_PATH);
  let chromium;
  try { ({ chromium } = require_("playwright")); } catch {
    t.skip("没有 playwright");
    return;
  }
  const html = buildPage();
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 700 } });
      const page = await ctx.newPage();
      await page.setContent(html);
      const bad = await page.evaluate(() => {
        const out = [];
        for (const b of document.querySelectorAll(".reader-workspace-bar button")) {
          const r = b.getBoundingClientRect();
          const label = (b.textContent || "").trim().slice(0, 10) || b.className;
          if (r.width < 2 || r.height < 2) { out.push(`${label}: 尺寸为 0`); continue; }
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit) { out.push(`${label}: 命中不到任何元素`); continue; }
          if (hit !== b && !b.contains(hit)) {
            const blocker = hit.closest("[class]");
            const name = blocker && typeof blocker.className === "string"
              ? blocker.className.split(" ")[0] : hit.tagName;
            out.push(`${label}: 被 .${name} 接走`);
          }
        }
        // 正对照：按钮真的渲染出来了，否则上面的循环是空的。
        return { bad: out, count: document.querySelectorAll(".reader-workspace-bar button").length };
      });
      assert.ok(bad.count >= 3, `${width}px 下顶栏只有 ${bad.count} 个按钮，页面八成没渲染出来`);
      if (bad.bad.length) failures.push(`${width}px → ${bad.bad.join("; ")}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(failures, []);
});
