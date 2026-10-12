import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useReadingAnchor } from "../../../../frontend/packages/reader/src/pdf/useReadingAnchor.ts";
import { pickPageAtFocus } from "../../../../frontend/packages/reader/src/pdf/scroll-to-page.ts";
import { loadReaderViewState, saveReaderViewState } from "../../../../frontend/packages/reader/src/shared/state/reader-view-state.ts";

async function fixture(t, restoreReady = true) {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/reader.html" });
  for (const key of ["window", "document", "localStorage", "HTMLElement", "Element", "Node", "Event", "WheelEvent", "KeyboardEvent"]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  const shell = document.createElement("div");
  document.body.append(shell);
  shell.getBoundingClientRect = () => ({ top: 0, width: 600, height: 500 });
  for (let page = 1; page <= 4; page++) {
    const el = document.createElement("div");
    el.dataset.readerPage = `${page}`;
    el.dataset.readerPane = "source";
    el.getBoundingClientRect = () => ({ top: (page - 1) * 800 - shell.scrollTop, bottom: page * 800 - shell.scrollTop, width: 600, height: 800 });
    shell.append(el);
  }
  const key = "document:gesture-fixture";
  saveReaderViewState(key, { anchor: { page: 2, fraction: 0 } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const shellRef = { current: shell };
  function Probe({ ready = restoreReady }) {
    useReadingAnchor(shellRef, { primaryPane: "source", mode: "source", persistenceKey: key, restoreReady: ready });
    return null;
  }
  await act(async () => root.render(createElement(Probe)));
  await act(async () => t.mock.timers.tick(48));
  if (restoreReady) assert.equal(shell.scrollTop, 752, "control: the saved page was actually restored");
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); });
  return { shell, key, ready: () => act(async () => root.render(createElement(Probe, { ready: true }))) };
}

test("a user gesture before PDF readiness prevents a late initial restore", async (t) => {
  const { shell, key, ready } = await fixture(t, false);
  shell.dispatchEvent(new WheelEvent("wheel", { deltaY: 400 }));
  shell.scrollTop = 2400;
  shell.dispatchEvent(new Event("scroll"));
  await ready();
  await act(async () => t.mock.timers.tick(2000));
  assert.equal(shell.scrollTop, 2400);
  assert.equal(loadReaderViewState(key).anchor.page, 4);
});

test("waiting for PDF readiness does not overwrite the saved anchor with the initial shell position", async (t) => {
  const { shell, key, ready } = await fixture(t, false);
  await act(async () => t.mock.timers.tick(250));
  assert.equal(loadReaderViewState(key).anchor.page, 2);
  await ready();
  await act(async () => t.mock.timers.tick(2000));
  assert.equal(shell.scrollTop, 752);
});

for (const gesture of ["wheel", "touchmove", "PageDown"]) {
  test(`reader restore yields to ${gesture} and saves the user position`, async (t) => {
    const { shell, key } = await fixture(t);
    if (gesture === "PageDown") window.dispatchEvent(new KeyboardEvent("keydown", { key: gesture, bubbles: true }));
    else shell.dispatchEvent(gesture === "wheel" ? new WheelEvent("wheel", { deltaY: 400 }) : new Event("touchmove"));
    shell.scrollTop = 2400;
    shell.dispatchEvent(new Event("scroll"));
    await act(async () => t.mock.timers.tick(2000));
    assert.equal(shell.scrollTop, 2400, "remaining restore attempts must not pull the user back");
    assert.equal(loadReaderViewState(key).anchor.page, 4);
  });
}

test("programmatic scroll and navigation keys in a text input retain layout restoration", async (t) => {
  const { shell } = await fixture(t);
  const input = document.createElement("input");
  document.body.append(input);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true }));
  shell.scrollTop = 0;
  shell.dispatchEvent(new Event("scroll"));
  await act(async () => t.mock.timers.tick(2000));
  assert.equal(shell.scrollTop, 752);
});

test("hidden page nodes do not manufacture a first-page reading position", () => {
  const page = { getBoundingClientRect: () => ({ top: 0, bottom: 0, width: 0, height: 0 }), getAttribute: () => "1" };
  assert.equal(pickPageAtFocus([page], 48), null);
});
