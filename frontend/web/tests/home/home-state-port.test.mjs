// 首页 state port / home store：不派发全局事件、不依赖遗留全局 state 单例。
// 原在 library/recent-jobs.test.mjs 里，被测的是 app/home/state，归到 home/。

import test from "node:test";
import assert from "node:assert/strict";
import {
  createHomeStatePort,
  createHomeStore,
} from "../../src/app/home/state/home-store.js";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";

test("home state port updates state without dispatching app events", () => {
  const previousDocument = global.document;
  const previousCustomEvent = global.CustomEvent;
  const events = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  global.document = {
    dispatchEvent(event) {
      events.push(event);
    },
  };

  try {
    const localState = createLegacyStateFixture();
    const port = createHomeStatePort(localState);
    port.setViewMode("bad-mode");
    assert.equal(port.getSnapshot().viewMode, "library");
    // 迁移完成:store 是唯一真值,旧 state 对象不再被回写
    assert.equal(localState.homeViewMode, "library");
    // 死事件已删：setViewMode / setRecentJobsLoadingState 不再派发任何事件
    assert.deepEqual(events, []);

    port.setRecentJobsLoadingState("error", "boom");
    assert.equal(port.getSnapshot().recentJobsLoadingState, "error");
    assert.equal(port.getSnapshot().recentJobsError, "boom");
    assert.deepEqual(events, []);
    assert.deepEqual(port.getSnapshot(), {
      viewMode: "library",
      recentJobsLoadingState: "error",
      recentJobsError: "boom",
    });
  } finally {
    global.document = previousDocument;
    global.CustomEvent = previousCustomEvent;
  }
});

test("home state port normalizes initial state and tolerates missing event APIs", () => {
  const localState = {
    homeViewMode: "bad-mode",
    homeRecentJobsLoadingState: "bad-loading",
    homeRecentJobsError: 123,
  };
  const port = createHomeStatePort(localState, {
    eventTarget: {},
  });

  assert.deepEqual(port.getSnapshot(), {
    viewMode: "library",
    recentJobsLoadingState: "idle",
    recentJobsError: "123",
  });
  // 不再回写旧对象:初始值保持调用方传入的原样
  assert.equal(localState.homeViewMode, "bad-mode");
  assert.equal(localState.homeRecentJobsLoadingState, "bad-loading");
  assert.equal(localState.homeRecentJobsError, 123);

  port.setViewMode("workflow_status");
  port.setRecentJobsLoadingState("bad-loading", "boom");

  assert.deepEqual(port.getSnapshot(), {
    viewMode: "workflow_status",
    recentJobsLoadingState: "idle",
    recentJobsError: "boom",
  });
});

test("home state port dispatches no events through an injected event target", () => {
  const previousCustomEvent = global.CustomEvent;
  const events = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  try {
    const port = createHomeStatePort({}, {
      eventTarget: {
        dispatchEvent(event) {
          events.push(event);
        },
      },
    });

    port.setViewMode("workflow_upload");
    port.setRecentJobsLoadingState("ready");

    // 死事件已删：即使注入 eventTarget，也不派发任何事件
    assert.deepEqual(events, []);
  } finally {
    global.CustomEvent = previousCustomEvent;
  }
});

test("home store owns home state without the legacy global state object", () => {
  const store = createHomeStore({
    homeViewMode: "workflow_upload",
    homeRecentJobsLoadingState: "loading",
  });
  assert.deepEqual(store.getSnapshot(), {
    viewMode: "workflow_upload",
    recentJobsLoadingState: "loading",
    recentJobsError: "",
  });

  store.actions.setViewMode("bad-mode");
  store.actions.setRecentJobsLoadingState("error", "boom");

  assert.deepEqual(store.getSnapshot(), {
    viewMode: "library",
    recentJobsLoadingState: "error",
    recentJobsError: "boom",
  });
});
