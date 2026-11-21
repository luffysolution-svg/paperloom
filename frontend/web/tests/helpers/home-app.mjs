/** 把整个 HomeApp 挂进 jsdom，供需要「真主页」的组件测试共用。
 *
 * 原来七八个测试文件各抄一份 bootHomeApp / mountHome，区别只在等哪个元素出现才算
 * 首帧落地。React / HomeApp 都是动态 import —— 调用方必须先 makeDom() 装好全局，
 * 这些模块在 import 时就会读 window / document。
 */
import { byId } from "./dom.mjs";
import { wait, waitFor } from "./async.mjs";

/** 不碰网络、不读本机配置的最小主页装配。 */
export async function createTestHomeComposition(overrides = {}) {
  const { createHomeComposition } = await import("../../src/app/home/create-home-composition.js");
  return createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
    ...overrides,
  });
}

/** 挂载 HomeApp，等 readyId 对应的元素出现再多让一拍。
 *
 * services 不传时用 createTestHomeComposition()；需要自定义装配（mock 校验器、术语表
 * API 等）的测试自己建好再传进来。 */
export async function bootHomeApp(dom, {
  services,
  hostId = "home-root",
  readyId = "app-shell",
  readyDescription = "HomeApp 首帧渲染",
} = {}) {
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { HomeApp } = await import("../../src/app/home/HomeApp.jsx");

  const host = dom.window.document.createElement("div");
  host.id = hostId;
  dom.window.document.body.appendChild(host);

  const homeServices = services ?? await createTestHomeComposition();
  homeServices.initialize();

  const root = createRoot(host);
  root.render(React.createElement(HomeApp, { services: homeServices }));
  await waitFor(() => byId(dom, readyId), readyDescription);
  await wait(0);
  return { services: homeServices, root, host };
}
