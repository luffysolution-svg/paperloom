// useStoreSnapshot 的快照缓存在「无订阅者期间」必须能自愈。
//
// 背景：platform/store 的 getSnapshot() 每次调用都返回一份全新的 frozen clone，
// 引用不稳定，直接喂给 useSyncExternalStore 会无限重渲染。所以 use-store.ts 用一个
// 模块级 WeakMap（snapshotCache）把快照缓存起来，getSnapshot 只读缓存。
//
// 曾经的 bug：这个缓存唯一的写入点在订阅回调内部——
//
//   store.subscribe((snapshot) => { snapshotCache.set(store, snapshot); onStoreChange(); })
//
// 也就是说，缓存只有在「有人正在订阅」的时候才会被刷新。一旦某个 store 的所有
// 订阅组件都卸载了，对它的写入会走 store.notify()，但 listener 集合是空的，
// 没有任何人更新 snapshotCache。store 自身状态是新的，缓存里却还是卸载那一刻的旧快照。
// 等组件重新挂载，getSnapshot() 从 WeakMap 读到的就是**过期快照**，首屏渲染旧数据；
// 之后随便哪一次真实写入会顺手刷新缓存，界面才跳回正确值。
// 对用户来说就是「重新打开时显示上次的残留，随便动一下就自己好了」。
//
// 实测到的可见症状（上传弹窗）：关弹窗时上传区组件全部卸载，openUpload() 的第一件事
// 是 resetUploadSession()——这次复位恰好落在「无订阅者」的窗口里，然后才 open() 触发
// 重新挂载。结果再次打开时屏幕上同时出现三句互相矛盾的话：卡片显示上一份文件名、
// 「直接翻译」按钮可点、点下去不发请求并报「请先选择并上传 PDF 文件」。
// 界面读的是过期缓存，业务逻辑读的是 store 真值，两边对不上。
//
// 修复：在**订阅建立时**先把缓存对齐一次，再挂监听。useSyncExternalStore 在挂载的
// layout effect 里调用 subscribe，紧接着会自查一次 getSnapshot() 是否变化，变了就在
// paint 之前强制补一次渲染——所以用户看不到闪帧，同时也不破坏「同一次 render 内
// getSnapshot 引用稳定」这条硬性要求（刷新发生在两次 render 之间）。
//
// 不写这条测试就会重犯：所有断言都只在「卸载 → 无订阅者期间写入 → 重新挂载」这个
// 特定序列下才失败。日常开发里组件一直挂着，缓存一直被订阅回调喂新值，怎么点都是对的；
// 单元测试如果只测「挂载后 store 变更能拿到新值」（use-store-hook.test.mjs 就是这样）
// 也一样全绿。只有显式模拟这段「空窗期」才能锁住它。

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "CustomEvent", "Event", "Node", "navigator"]) {
  try {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  } catch (_err) { /* navigator 只读时忽略 */ }
}
globalThis.window = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createStore } = await import("../../src/platform/store/store.js");
const { useStoreSnapshot } = await import("../../src/ui/hooks/use-store.js");

// 每个 probe 用独立容器，避免同一个 DOM 节点上反复 createRoot 触发 React 警告。
function mountProbe(store, selector) {
  const renders = [];
  function Probe() {
    renders.push(useStoreSnapshot(store, selector));
    return null;
  }
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Probe));
  });
  return {
    renders,
    // act() 结束时 React 已经把 subscribe 之后的自查重渲染也刷完了，
    // 所以最后一次 render 的值就是 paint 时用户真正看到的值。
    settled: () => renders.at(-1),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

test("卸载期间被复位的 store，重新挂载时读到的是新值而不是旧快照", () => {
  const store = createStore({
    name: "upload-session",
    initialState: { fileName: null, uploaded: false },
    actions: {
      pickFile: (state, fileName) => ({ ...state, fileName, uploaded: true }),
      resetSession: (state) => ({ ...state, fileName: null, uploaded: false }),
    },
  });

  // 1. 第一次打开弹窗：挂载 → 传一份 PDF。此时有订阅者，缓存被订阅回调喂成新值。
  const first = mountProbe(store);
  act(() => {
    store.actions.pickFile("babeldoc-10p.pdf");
  });
  assert.equal(first.settled().fileName, "babeldoc-10p.pdf", "挂载期间的写入应正常可见");

  // 2. 关弹窗：组件卸载，listener 集合清空。缓存停在 "babeldoc-10p.pdf" 这一刻。
  first.unmount();

  // 3. 复位恰好发生在「无订阅者」的空窗期——notify() 遍历的是空集合，没人刷缓存。
  store.actions.resetSession();
  assert.equal(store.getSnapshot().fileName, null, "前提：store 自身状态确实已经复位");

  // 4. 再次打开弹窗：重新挂载。修复前这里读到的是过期的 "babeldoc-10p.pdf"。
  const second = mountProbe(store);
  assert.equal(
    second.settled().fileName,
    null,
    "重新挂载必须读到复位后的真值，读到旧文件名说明快照缓存没在订阅时对齐",
  );
  assert.equal(second.settled().uploaded, false, "派生出来的可点击状态同样不得残留");
  assert.ok(
    second.renders.length <= 3,
    `重新挂载不应重渲染失控，实际 ${second.renders.length} 次`,
  );
  second.unmount();
});

test("selector 分支同样自愈，且同一次 render 内引用保持稳定", () => {
  const store = createStore({
    name: "upload-session-selected",
    initialState: { fileName: null, noise: 0 },
    actions: {
      pickFile: (state, fileName) => ({ ...state, fileName }),
      resetSession: (state) => ({ ...state, fileName: null }),
      bumpNoise: (state) => ({ ...state, noise: state.noise + 1 }),
    },
  });
  const selector = (snapshot) => ({ fileName: snapshot.fileName });

  const first = mountProbe(store, selector);
  act(() => {
    store.actions.pickFile("babeldoc-10p.pdf");
  });
  assert.equal(first.settled().fileName, "babeldoc-10p.pdf");
  first.unmount();

  store.actions.resetSession();

  const second = mountProbe(store, selector);
  assert.equal(
    second.settled().fileName,
    null,
    "selector 分支读的是同一个 snapshotCache，过期同样会传染到选中的切片",
  );

  // selectionRef 的浅比较缓存必须还好使：无关切片变化不得把组件叫醒，
  // 否则说明订阅时刷新缓存破坏了 selector 的引用稳定性。
  const beforeNoise = second.renders.length;
  act(() => {
    store.actions.bumpNoise();
  });
  assert.equal(
    second.renders.length,
    beforeNoise,
    "noise 变化与 selector 选中的切片无关，不应触发重渲染",
  );
  second.unmount();
});

test("空窗期的多次写入只需最后一次可见，中间态不得泄漏到重新挂载后", () => {
  const store = createStore({
    name: "upload-session-multi",
    initialState: { step: "idle" },
    actions: { go: (state, step) => ({ ...state, step }) },
  });

  const first = mountProbe(store);
  first.unmount();

  // 卸载后连写三次：没有任何监听器，三次 notify 全部空转。
  // 终值刻意不等于初始值，否则「缓存停在初始快照」也能蒙混过关。
  store.actions.go("uploading");
  store.actions.go("uploaded");
  store.actions.go("ready");

  const second = mountProbe(store);
  assert.equal(second.settled().step, "ready", "重新挂载应对齐到最后一次写入的结果");
  second.unmount();
});
