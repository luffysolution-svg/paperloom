import test from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  LiveTranslationOverlay,
  clearLiveTranslationFitCache,
  computeLiveTranslationFit,
} from "../../../../frontend/packages/reader/src/pdf/LiveTranslationOverlay.tsx";

// The pre-optimization search, kept verbatim as the equivalence oracle.
function referenceFit(measure, availableWidth, availableHeight, input) {
  const { minFontSizePx, maxFontSizePx } = input;
  let low = minFontSizePx;
  let high = maxFontSizePx;
  let fitted = Math.min(input.requestedFontSizePx, high);
  const fits = (size) => {
    const { width, height } = measure(size);
    return width <= availableWidth + 0.5 && height <= availableHeight + 0.5;
  };
  if (!fits(fitted)) {
    high = fitted;
    fitted = low;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const candidate = (low + high) / 2;
      if (fits(candidate)) {
        fitted = candidate;
        low = candidate;
      } else {
        high = candidate;
      }
    }
  } else if (!input.exact) {
    low = fitted;
    for (let iteration = 0; iteration < 6; iteration += 1) {
      const candidate = (low + high) / 2;
      if (fits(candidate)) {
        fitted = candidate;
        low = candidate;
      } else {
        high = candidate;
      }
    }
  }
  return Math.max(minFontSizePx, fitted);
}

function makeOracle(a, b, c, d) {
  return (size) => ({
    width: Math.abs(Math.sin(size * a + c)) * 500,
    height: Math.abs(Math.cos(size * b + d)) * 500,
  });
}

test("fitted-size search is bit-identical to the previous binary search", () => {
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let caseIndex = 0; caseIndex < 400; caseIndex += 1) {
    const minFontSizePx = 3 + rand() * 5;
    const maxFontSizePx = minFontSizePx + rand() * 40;
    const requestedFontSizePx = minFontSizePx + rand() * (maxFontSizePx - minFontSizePx);
    const input = {
      minFontSizePx,
      maxFontSizePx,
      requestedFontSizePx,
      exact: rand() < 0.5,
    };
    const availableWidth = 1 + rand() * 400;
    const availableHeight = 1 + rand() * 400;
    const measure = makeOracle(0.7 + rand(), 0.9 + rand(), rand() * 6, rand() * 6);
    assert.equal(
      computeLiveTranslationFit(measure, availableWidth, availableHeight, input),
      referenceFit(measure, availableWidth, availableHeight, input),
      `case ${caseIndex}`,
    );
  }
});

test("fitted-size search keeps the exact degenerate-bracket results", () => {
  const fitsAlways = () => ({ width: 1, height: 1 });
  const neverFits = () => ({ width: 10000, height: 10000 });
  const cases = [
    [{ minFontSizePx: 7, maxFontSizePx: 7, requestedFontSizePx: 7, exact: true }, fitsAlways],
    [{ minFontSizePx: 7, maxFontSizePx: 7, requestedFontSizePx: 7, exact: false }, fitsAlways],
    [{ minFontSizePx: 7, maxFontSizePx: 7, requestedFontSizePx: 7, exact: true }, neverFits],
    [{ minFontSizePx: 7, maxFontSizePx: 7, requestedFontSizePx: 7, exact: false }, neverFits],
    [{ minFontSizePx: 5, maxFontSizePx: 20, requestedFontSizePx: 20, exact: false }, fitsAlways],
    [{ minFontSizePx: 5, maxFontSizePx: 20, requestedFontSizePx: 20, exact: true }, fitsAlways],
    [{ minFontSizePx: 5, maxFontSizePx: 20, requestedFontSizePx: 5, exact: false }, neverFits],
  ];
  for (const [input, measure] of cases) {
    assert.equal(
      computeLiveTranslationFit(measure, 100, 100, input),
      referenceFit(measure, 100, 100, input),
    );
  }
});

test("fitted-size search never probes more distinct sizes than the old search", () => {
  let calls = 0;
  const measure = (size) => {
    calls += 1;
    return { width: size * 12, height: size * 9 };
  };
  const input = { minFontSizePx: 5, maxFontSizePx: 40, requestedFontSizePx: 20, exact: false };
  computeLiveTranslationFit(measure, 100, 100, input);
  assert.ok(calls <= 9, `expected <= 9 layout probes, got ${calls}`);
});

test("overlay reuses the cached fitted size across SSE re-renders", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/reader.html",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  let reads = 0;
  const defineLayout = () => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        reads += 1;
        const size = Number.parseFloat(this.style.fontSize) || 1;
        const text = this.textContent || "";
        return Math.max(1, Math.ceil(text.length * size * 0.7));
      },
    });
    Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        reads += 1;
        const size = Number.parseFloat(this.style.fontSize) || 1;
        const text = this.textContent || "";
        const lineHeight = 1.3;
        const lineWidth = Math.max(1, text.length * size * 0.7);
        const lines = Math.max(1, Math.ceil(lineWidth / 100));
        return Math.ceil(lines * lineHeight * size);
      },
    });
  };
  defineLayout();

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  clearLiveTranslationFitCache();

  const layout = {
    page_idx: 0,
    width: 100,
    height: 200,
    blocks: [{ item_id: "b1", bbox: [0, 0, 50, 50], source_text: "source", kind: "text" }],
  };
  const pageState = (lastSeq) => ({
    attempt: 1,
    generation: 1,
    pageHash: "h",
    itemsById: new Map([["b1", {
      item_id: "b1",
      translated_text: "一段比较长的译文内容用于测试字号回流",
      status: "translated",
    }]]),
    changedAtSeqById: new Map([["b1", 1]]),
    lastEventSeq: lastSeq,
  });

  const root = createRoot(window.document.getElementById("root"));
  try {
    await act(async () => {
      root.render(createElement(LiveTranslationOverlay, {
        layoutPage: layout,
        pageState: pageState(1),
        width: 100,
        height: 200,
      }));
    });
    const content = window.document.querySelector(".reader-live-translation-content");
    assert.ok(content, "overlay content rendered");
    const firstReads = reads;
    const firstFontSize = content.style.fontSize;
    assert.ok(firstReads > 0, "initial fit must measure the content");
    assert.match(firstFontSize, /px$/);

    await act(async () => {
      root.render(createElement(LiveTranslationOverlay, {
        layoutPage: layout,
        pageState: pageState(2),
        width: 100,
        height: 200,
      }));
    });
    assert.equal(reads, firstReads, "cached re-render must not force another layout read");
    assert.equal(content.style.fontSize, firstFontSize, "cached re-render keeps the fitted size");
  } finally {
    await act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    if (previous.IS_REACT_ACT_ENVIRONMENT === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    else globalThis.IS_REACT_ACT_ENVIRONMENT = previous.IS_REACT_ACT_ENVIRONMENT;
    clearLiveTranslationFitCache();
    dom.window.close();
  }
});
