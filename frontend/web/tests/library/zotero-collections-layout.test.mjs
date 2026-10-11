import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

test("large Zotero collection lists keep readable rows and scroll to the last category", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const css = readFileSync(new URL("../../src/styles/pages/home/zotero-import.css", import.meta.url), "utf8");
    const buttons = Array.from({ length: 150 }, (_, i) => `<button>Collection ${i + 1}</button>`).join("");
    await page.setContent(`<style>${css}</style><div class="home-zotero-layout" style="height:500px"><nav class="home-zotero-collections"><select><option>My library</option></select>${buttons}</nav><section class="home-zotero-items">Items</section></div>`);
    const dimensions = await page.locator(".home-zotero-collections").evaluate((nav) => ({
      rowHeights: [...nav.querySelectorAll("button")].map((button) => button.getBoundingClientRect().height),
      height: nav.clientHeight,
      scrollHeight: nav.scrollHeight,
    }));
    assert.ok(dimensions.rowHeights.every((height) => height >= 24), "category text must not be squeezed out of its row");
    assert.ok(dimensions.scrollHeight > dimensions.height, "large lists must scroll");
    const last = page.getByRole("button", { name: "Collection 150", exact: true });
    await last.click();
    assert.ok(await page.locator(".home-zotero-collections").evaluate((nav) => nav.scrollTop > 0));
    await page.setViewportSize({ width: 600, height: 900 });
    assert.ok(await page.locator(".home-zotero-collections").evaluate((nav) => nav.scrollWidth > nav.clientWidth), "narrow layouts must scroll horizontally");
    await last.click();
  } finally {
    await browser.close();
  }
});
