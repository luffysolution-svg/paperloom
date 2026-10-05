import test from "node:test";
import assert from "node:assert/strict";

import {
  createResource,
} from "../../src/platform/store/resource.js";
import {
  createStore,
} from "../../src/platform/store/store.js";
import {
  createDialogStore,
} from "../../src/platform/store/dialog-store.js";

function silenceConsoleError() {
  const errors = [];
  const original = console.error;
  console.error = (...args) => {
    errors.push(args);
  };
  return {
    errors,
    restore: () => {
      console.error = original;
    },
  };
}

test("resource 同 key 并发复用同一在途 promise", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const resource = createResource({
    name: "inflight-dedup",
    loader: async () => {
      calls += 1;
      return gate;
    },
  });

  const first = resource.load({ q: 1 });
  const second = resource.load({ q: 1 });
  assert.equal(calls, 1);
  release({ ok: true });
  const [snap1, snap2] = await Promise.all([first, second]);
  assert.equal(snap1.status, "success");
  assert.deepEqual(snap2.data, { ok: true });
});

test("resource 缓存命中同样推进 requestId,旧在途过期", async () => {
  let releaseSlow;
  const gate = new Promise((resolve) => {
    releaseSlow = resolve;
  });
  const resource = createResource({
    name: "cache-bumps-request",
    loader: async (params) => {
      if (params.id === "slow") {
        return gate;
      }
      return { id: params.id };
    },
    cacheKey: ({ id }) => id,
  });

  await resource.load({ id: "cached" });
  const slowPromise = resource.load({ id: "slow" });
  await resource.load({ id: "cached" });
  releaseSlow({ id: "slow" });
  await slowPromise;

  assert.deepEqual(resource.getSnapshot().data, { id: "cached" });
});

test("resource 后台刷新失败默认保留旧 data,keepData:false 显式清", async () => {
  let mode = "ok";
  const resource = createResource({
    name: "keep-data",
    loader: async () => {
      if (mode === "fail") {
        throw new Error("boom");
      }
      return { v: 1 };
    },
  });

  await resource.load({});
  mode = "fail";
  const failed = await resource.load({}, { cache: false });
  assert.equal(failed.status, "error");
  assert.deepEqual(failed.data, { v: 1 });
  const cleared = await resource.load({}, { cache: false, keepData: false });
  assert.equal(cleared.status, "error");
  assert.equal(cleared.data, null);
});

test("resource reset 默认清 cache,keepCache 显式保留", async () => {
  let calls = 0;
  const resource = createResource({
    name: "reset-cache",
    loader: async () => {
      calls += 1;
      return { v: calls };
    },
  });

  await resource.load({});
  resource.reset();
  await resource.load({});
  assert.equal(calls, 2);

  await resource.load({});
  resource.reset({ keepCache: true });
  await resource.load({});
  assert.equal(calls, 2);
});

test("resource 默认 cacheKey 键序稳定", async () => {
  let calls = 0;
  const resource = createResource({
    name: "stable-key",
    loader: async (params) => {
      calls += 1;
      return { ...params };
    },
  });

  await resource.load({ a: 1, b: 2 });
  const snapshot = await resource.load({ b: 2, a: 1 });
  assert.equal(calls, 1);
  assert.deepEqual(snapshot.data, { a: 1, b: 2 });
});

test("store 订阅者抛错不掐断扇出并可观测", () => {
  const guard = silenceConsoleError();
  try {
    const store = createStore({
      name: "fanout",
      initialState: { n: 0 },
      actions: { bump: (state) => ({ ...state, n: state.n + 1 }) },
    });
    const seen = [];
    store.subscribe(() => {
      throw new Error("listener boom");
    });
    store.subscribe((snapshot) => {
      seen.push(snapshot.n);
    });
    store.actions.bump();
    assert.deepEqual(seen, [1]);
    assert.equal(guard.errors.length, 1);
  } finally {
    guard.restore();
  }
});

test("resource 订阅者抛错不掐断扇出并可观测", async () => {
  const guard = silenceConsoleError();
  try {
    const resource = createResource({
      name: "fanout",
      loader: async () => ({ ok: true }),
    });
    const seen = [];
    resource.subscribe(() => {
      throw new Error("listener boom");
    });
    resource.subscribe((snapshot) => {
      seen.push(snapshot.status);
    });
    await resource.load({});
    assert.ok(seen.includes("success"));
    assert.ok(guard.errors.length >= 1);
  } finally {
    guard.restore();
  }
});

test("dialog 订阅者抛错不掐断扇出并可观测", () => {
  const guard = silenceConsoleError();
  try {
    const dialog = createDialogStore(null);
    const seen = [];
    dialog.subscribe(() => {
      throw new Error("listener boom");
    });
    dialog.subscribe((state) => {
      seen.push(state.open);
    });
    dialog.open({ id: "a" });
    assert.deepEqual(seen, [true]);
    assert.equal(guard.errors.length, 1);
  } finally {
    guard.restore();
  }
});

test("store action 返回完整新状态并整包替换", () => {
  const store = createStore({
    name: "whole-replace",
    initialState: { a: 0, b: "keep" },
    actions: { onlyA: (state) => ({ a: state.a + 1 }) },
  });
  store.actions.onlyA();
  assert.deepEqual(store.getSnapshot(), { a: 1 });
});

test("dialog open 同 payload 不通知并保持引用", () => {
  const dialog = createDialogStore(null);
  const item = { id: "a" };
  dialog.open(item);
  let notes = 0;
  dialog.subscribe(() => {
    notes += 1;
  });
  const again = dialog.open(item);
  assert.equal(notes, 0);
  assert.equal(again, dialog.getState());
});

test("dialog close 清 payload,不恢复旧负载", () => {
  const dialog = createDialogStore(null);
  dialog.open({ id: "a" });
  dialog.close();
  assert.equal(dialog.getState().open, false);
  assert.equal(dialog.getState().payload, null);
  dialog.open();
  assert.equal(dialog.getState().payload, null);

  const settings = createDialogStore({ tab: "api" });
  settings.open({ tab: "update" });
  settings.close();
  assert.deepEqual(settings.getState().payload, { tab: "api" });
});
