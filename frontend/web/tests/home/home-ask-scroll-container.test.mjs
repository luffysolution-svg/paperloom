/**
 * 跟随底部的 ref 必须挂在真正会滚的那个节点上。
 *
 * 这是一条会静默失效的接线：把 ref 挂到一个不滚动的 div 上，什么都不会报错——
 * scrollHeight === clientHeight，于是「贴底」判定恒为真，scrollTo 在非滚动容器上
 * 又是空操作。行为回到「完全不跟随」，而 use-stick-to-bottom 自己的测试照样全绿，
 * 因为那里的容器是手造的。
 *
 * 所以这里同时钉两头：视图把 ref 挂在 `.home-ask-scroll` 上，且这个类确实带
 * `overflow-y: auto`。哪一头被改掉都会红。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const view = readFileSync(
  new URL("../../src/features/ask/ui/HomeAskView.tsx", import.meta.url), "utf8",
);
const css = readFileSync(
  new URL("../../src/styles/pages/home/home-ask.css", import.meta.url), "utf8",
);

describe("跟随底部的滚动容器", () => {
  it("视图把 ref 交给了 useStickToBottom", () => {
    assert.match(view, /useStickToBottom\s*\(\s*threadScrollRef/,
      "滚动容器的 ref 没有接进跟随逻辑");
  });

  it("ref 挂在 .home-ask-scroll 上", () => {
    assert.match(view, /className="home-ask-scroll"\s+ref=\{threadScrollRef\}/,
      "ref 不在 .home-ask-scroll 上——挂到不滚动的节点上跟随会静默失效");
  });

  it(".home-ask-scroll 确实是纵向滚动容器", () => {
    const block = css.match(/\.home-ask-scroll\s*\{([^}]*)\}/)?.[1] || "";
    assert.match(block, /overflow-y:\s*(auto|scroll)/,
      ".home-ask-scroll 不再滚动了，跟随会落到空处");
  });

  it("流式期间把 streaming 传下去", () => {
    assert.match(view, /useStickToBottom\([^)]*streaming:\s*isRunning/,
      "没把流式状态传下去，增量会触发一串互相打断的平滑滚动");
  });

  it("判据包含最后一条消息的长度——只看条数的话流式增量不会触发跟随", () => {
    const key = view.match(/const threadChangeKey = useMemo\(\(\) => \{([\s\S]*?)\}, \[messages\]\);/)?.[1] || "";
    assert.ok(key.includes("content?.length"), `判据里没有正文长度:${key.trim()}`);
  });
});
