import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LibraryBatchToolbar } from "../../src/features/library/ui/page/LibraryBatchToolbar.tsx";

test("batch actions stay inside the floating toolbar at desktop and phone widths", async () => {
  const css = readFileSync(new URL("../../dist/css/home.css", import.meta.url), "utf8");
  const toolbar = renderToStaticMarkup(createElement(LibraryBatchToolbar, { count: 2, totalSelectable: 4 }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><style>${css}</style>${toolbar}`);
    for (const width of [1307, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 768 });
      const outside = await page.getByLabel("批量操作工具栏").evaluate((bar) => {
        const bounds = bar.getBoundingClientRect();
        return [...bar.querySelectorAll("button")].filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.left < Math.max(0, bounds.left) || rect.right > Math.min(innerWidth, bounds.right);
        }).map((button) => button.textContent);
      });
      assert.deepEqual(outside, [], `Buttons outside toolbar at ${width}px: ${outside.join(", ")}`);
    }
  } finally {
    await browser.close();
  }
});
