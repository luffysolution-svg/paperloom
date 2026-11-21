/**
 * 「曾经打开过」latch：上面三个面板是 lazy 的，但 lazy() 的动态 import 在组件
 * 挂载时就会触发 —— 无条件渲染(仅用 open 控制显隐)会让分包边界形同虚设，
 * reader 首屏因此白拉整个 AI 面板与 mathjax。
 *
 * 不能改成 `open && <Panel/>` 条件渲染：关闭即卸载会丢掉面板内部状态
 * (AI 会话、滚动位置)。故首次打开后就一直挂载，仅把首次加载推迟到真正需要时。
 *
 * 用 ref 而非 state：取值只会 false→true 单调翻转，且发生在 open 变化已经
 * 触发的那次渲染内，不需要额外再渲染一轮。
 */
export declare function useMountedSinceFirstOpen(open: boolean): boolean;
//# sourceMappingURL=use-mounted-since-first-open.d.ts.map