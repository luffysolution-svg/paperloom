/** jsdom 组件测试共用的「装 DOM + 模拟交互」工具。
 *
 * 原来二十来个组件测试各自抄一份 makeDom / click / byId / typeInput，彼此只差在装到
 * globalThis 上的 key 列表。这里把那份最常见的列表定为默认值，确实需要别的组合的
 * 文件显式传 keys —— 多装一个全局（比如 getComputedStyle、localStorage）可能改变被测
 * 组件走的分支，所以没有把所有列表并成一个超集。
 */
import { JSDOM } from "jsdom";

const BLANK_PAGE = "<!doctype html><html><body></body></html>";

/** 主页类组件测试默认要装到 globalThis 上的 jsdom 对象。
 *
 * NodeFilter 是 Radix Dialog 的 FocusScope 遍历可聚焦元素要用的
 * （@radix-ui/react-focus-scope 的 getTabbableCandidates）。 */
export const DOM_GLOBAL_KEYS = Object.freeze([
  "window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement",
  "HTMLFormElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent",
  "MouseEvent", "Node", "MutationObserver", "NodeFilter",
]);

/** 阅读页里单独挂一个面板（终端、看板条）时装的全局：没有表单类，多了
 * AbortController / localStorage / URL —— 面板会自己发请求、读本机存档。 */
export const READER_PANEL_DOM_KEYS = Object.freeze([
  "window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement",
  "CustomEvent", "Event", "MouseEvent", "Node", "MutationObserver", "NodeFilter",
  "AbortController", "localStorage", "URL",
]);

/** 新建一个 jsdom，并把 keys 里的对象装到 globalThis 上（不负责还原）。
 *
 * search 拼在 http://localhost/index.html 后面（`makeDom("?mock=done")`），要别的页面
 * 就传 url 整个覆盖。
 *
 * - requestAnimationFrame 用 setTimeout 模拟；cancelAnimationFrame 与 getComputedStyle
 *   是 Radix Presence / Tabs 要的（TabsContent 的 mount 动画计时器清理、Presence 读
 *   animation-name 判断退场动画是否结束）—— jsdom 的 window 上有，只是不会自动出现在
 *   裸 global 上。
 * - computedStyle: false 用于原本就没装 getComputedStyle 的测试，保持它们的环境不变。
 */
export function makeDom(search = "", {
  url = `http://localhost/index.html${search}`,
  html = BLANK_PAGE,
  keys = DOM_GLOBAL_KEYS,
  computedStyle = true,
} = {}) {
  const dom = new JSDOM(html, { url });
  for (const key of keys) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  if (computedStyle) globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

/** 阅读页组件测试用的 jsdom：带 #root、pretendToBeVisual，并且能 restore()。
 *
 * 阅读页的 hook 会直接读 history / location / localStorage / getSelection，还会在
 * window 上挂监听，所以这些都要装到 globalThis（函数要 bind 回 window）。restore()
 * 把装之前的值原样放回去，避免泄漏到同进程的下一个测试文件。
 */
export function installReaderDom({ url = "http://localhost/reader.html", extraKeys = [] } = {}) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url,
    pretendToBeVisual: true,
  });
  const boundKeys = [
    "requestAnimationFrame", "cancelAnimationFrame",
    "addEventListener", "removeEventListener", "dispatchEvent",
  ];
  const keys = [
    "window", "document", "history", "location", "localStorage", "HTMLElement", "Element",
    "Node", "Event", "MouseEvent", ...extraKeys, "MutationObserver",
    "getSelection", ...boundKeys,
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, globalThis[key]]));
  for (const key of keys) {
    const value = key === "getSelection" || boundKeys.includes(key)
      ? dom.window[key].bind(dom.window)
      : dom.window[key];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return {
    dom,
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
      }
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

export function byId(dom, id) {
  return dom.window.document.getElementById(id);
}

/** 只派发 click。普通 <button> 用它就够。 */
export function click(dom, element) {
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
}

/** 先 mousedown 再 click。
 *
 * Radix Tabs 的 Trigger 激活逻辑挂在 onMouseDown 上，只派发 click 切不了 tab。真实
 * 浏览器的点击本来就是 mousedown → mouseup → click，补上 mousedown 是让模拟更贴近
 * 真实交互，而不是放宽任何断言。cancelable 跟随各测试原来的写法。 */
export function clickWithMouseDown(dom, element, { cancelable = false } = {}) {
  const init = cancelable ? { bubbles: true, cancelable: true } : { bubbles: true };
  element.dispatchEvent(new dom.window.MouseEvent("mousedown", { ...init, button: 0 }));
  element.dispatchEvent(new dom.window.MouseEvent("click", init));
}

/** 受控输入框改值：走原型上的 value setter，React 才认这次 input 事件。 */
export function typeInput(dom, element, value) {
  const proto = element.tagName === "TEXTAREA"
    ? dom.window.HTMLTextAreaElement.prototype
    : dom.window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

/** 受控下拉框改值：同 typeInput，只是派发 change。 */
export function selectOption(dom, element, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}
